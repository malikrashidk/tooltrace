import { Router } from "express";
import { storage } from "../storage";
import { authMiddleware } from "../middleware";
import { apiKeyAuthMiddleware } from "./integration";
import { getDomain } from "tldts";
import { z } from "zod";
import { calculateSubscriptionProbability, calculateUsageIntensity } from "../../shared/known-tools";
import { sendToUser } from "../lib/websocket";

const router = Router();

// Schema for incoming activity events
const activityEventSchema = z.object({
  domain: z.string().min(1),
  duration: z.number().optional(), // in seconds
  hasSavedCredentials: z.boolean().optional(),
  authSignal: z.boolean().optional(),
  timestamp: z.number().optional(),
  paymentSignals: z.object({
    visitedBillingPage: z.boolean().optional(),
    billingPageUrl: z.string().nullable().optional(),
  }).optional(),
});

const batchActivitySchema = z.object({
  events: z.array(activityEventSchema),
});

// ============ ACTIVITY TRACKING ROUTE ============
// Accepts batch events from extension
router.post("/events", async (req, res, next) => {
  // Try API Key first (for potential future use), then Session Token
  if (req.headers.authorization?.startsWith('Bearer tt_')) {
    return apiKeyAuthMiddleware(req, res, next);
  }
  return authMiddleware(req, res, next);
}, async (req: any, res: any) => {
  try {
    const parsed = batchActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const userId = req.userId!;
    const { events } = parsed.data;
    const today = new Date().toISOString().split('T')[0];

    for (const event of events) {
      // Normalize domain
      const domainKey = getDomain(event.domain);
      if (!domainKey) continue;

      // Check if tool already exists
      const userTools = await storage.getUserTools(userId);
      const existingTool = userTools.find(t => {
        const tDomain = getDomain(t.websiteUrl);
        return tDomain === domainKey;
      });

      if (existingTool) {
        // Update existing tool usage
        if (event.duration && event.duration > 0) {
          const currentDuration = parseInt(existingTool.totalUsageTime || "0");
          const addedMinutes = Math.ceil(event.duration / 60);
          await storage.updateTool(existingTool.id, {
            totalUsageTime: String(currentDuration + addedMinutes),
            lastUsedAt: new Date(),
          });
        }
      } else {
        // Upsert detected site
        let site = await storage.getDetectedSite(userId, domainKey);

        if (!site) {
          site = await storage.createDetectedSite({
            userId,
            domainKey,
            displayName: domainKey.charAt(0).toUpperCase() + domainKey.slice(1),
            // We can enrich favicon later or let frontend handle it via google favicon service
            confidenceLevel: (event.hasSavedCredentials || event.authSignal) ? 'likely' : 'visited',
            status: 'new',
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
          });
        }

        // Calculate confidence update
        let newConfidence = site.confidenceLevel;
        if (event.hasSavedCredentials) {
          newConfidence = 'confirmed';
        } else if (event.authSignal && site.confidenceLevel === 'visited') {
          newConfidence = 'likely';
        }

        // Process payment signals
        const visitedBillingPage = event.paymentSignals?.visitedBillingPage || site.visitedBillingPage;
        const billingPageUrl = event.paymentSignals?.billingPageUrl || site.billingPageUrl;

        // Calculate updated visit counts for probability calculation
        const newVisitCount30d = site.visitCount30d + 1;

        // Calculate subscription probability and usage intensity
        const subscriptionProbability = calculateSubscriptionProbability(
          newVisitCount30d,
          visitedBillingPage || false,
          newConfidence,
          domainKey
        );
        const usageIntensity = calculateUsageIntensity(newVisitCount30d);

        // Update stats
        const visitDuration = event.duration || 0;
        const updatedSite = await storage.updateDetectedSite(site.id, {
          lastSeenAt: new Date(),
          visitCount7d: site.visitCount7d + 1,
          visitCount30d: newVisitCount30d,
          visitCount90d: site.visitCount90d + 1,
          confidenceLevel: newConfidence,
          visitedBillingPage: visitedBillingPage || false,
          billingPageUrl: billingPageUrl,
          subscriptionProbability: subscriptionProbability,
          usageIntensity: usageIntensity
        });

        // Update daily stats
        await storage.upsertDetectedSiteDaily(site.id, today, 1, visitDuration);

        // Broadcast update to user
        if (updatedSite) {
          sendToUser(userId, {
            type: "DETECTION_UPDATE",
            payload: updatedSite
          });

          // If probability is high, send a special notification
          if (subscriptionProbability >= 90 && (site.subscriptionProbability < 90 || !site.subscriptionProbability)) {
            sendToUser(userId, {
              type: "NOTIFICATION",
              payload: {
                title: "New Premium Detection!",
                message: `We're 90%+ sure you have a subscription at ${domainKey}. Check it out in Smart Tracker.`,
                domain: domainKey
              }
            });
          }
        }
      }
    }

    res.json({ success: true, processed: events.length });
  } catch (error) {
    console.error("Activity tracking error:", error);
    res.status(500).json({ error: "Failed to process activity events" });
  }
});

// ============ SMART TRACKER UI ROUTES ============
// Smart Tracker is available for Pro and Enterprise plans only

// GET /api/activity/smart-scan
// Returns detected sites + indication if they match an existing tool
// Requires Pro or Enterprise plan
router.get("/smart-scan", authMiddleware, async (req, res) => {
  try {
    const user = req.user as any;
    const userPlan = (user?.plan || 'free').toLowerCase();

    // Only Pro and Enterprise have access to Smart Tracker
    if (userPlan !== 'pro' && userPlan !== 'enterprise') {
      return res.status(403).json({
        error: "FEATURE_LOCKED",
        message: "Smart Tracker is available on Pro and Enterprise plans only."
      });
    }

    const sites = await storage.getDetectedSites(req.userId!);
    // Filter out ignored sites? Or let frontend filter?
    // Let's return all non-ignored, or let frontend handle filters.
    // The requirement says "Filters: Status: Not added / Already in Tooltrace".
    // "Already in Tooltrace" means toolId is set.

    // We also need to double check if any 'new' sites now match a tool (e.g. added manually)
    // But we can do that lazily or relying on the 'toolId' field which we should update if we find a match.
    // For now, return raw table data.

    res.json({ sites });
  } catch (error) {
    console.error("Smart Tracker fetch error:", error);
    res.status(500).json({ error: "Failed to fetch Smart Tracker results" });
  }
});

// PATCH /api/activity/smart-scan/:id
// Update detected site status (mark as added, ignored, etc)
// Requires Pro or Enterprise plan
router.patch("/smart-scan/:id", authMiddleware, async (req, res) => {
  try {
    const user = req.user as any;
    const userPlan = (user?.plan || 'free').toLowerCase();

    // Only Pro and Enterprise have access to Smart Tracker
    if (userPlan !== 'pro' && userPlan !== 'enterprise') {
      return res.status(403).json({
        error: "FEATURE_LOCKED",
        message: "Smart Tracker is available on Pro and Enterprise plans only."
      });
    }

    const { id } = req.params;
    const updates = req.body;

    // Verify ownership (implicit in getDetectedSite logic if we had getById, but here we iterate or trust ID? No, must verify)
    // Storage doesn't have getDetectedSiteById, only getDetectedSite(userId, domain).
    // Let's fetch all or add a getById method.
    // Wait, `updateDetectedSite` takes ID. But it doesn't check UserID ownership strictly in the query usually.
    // `DbStorage.updateDetectedSite` -> `UPDATE detected_sites SET ... WHERE id = $x`.
    // It doesn't check userId. This is a security flaw if we don't check.

    // I need to verify ownership.
    // Since I don't have getById, I'll filter from getDetectedSites (inefficient but safe) OR add getById.
    // For MVP, fetching all sites for user and checking ID is fine.
    const sites = await storage.getDetectedSites(req.userId!);
    const site = sites.find(s => s.id === id);

    if (!site) {
      return res.status(404).json({ error: "Site not found" });
    }

    const allowedUpdates: any = {};
    if (updates.status) allowedUpdates.status = updates.status;
    if (updates.isPaid !== undefined) allowedUpdates.isPaid = updates.isPaid;
    if (updates.billingAmount !== undefined) allowedUpdates.billingAmount = updates.billingAmount;
    if (updates.currency) allowedUpdates.currency = updates.currency;
    if (updates.billingCycle) allowedUpdates.billingCycle = updates.billingCycle;

    const updated = await storage.updateDetectedSite(id, allowedUpdates);
    res.json({ site: updated });
  } catch (error) {
    console.error("Smart tracker update error:", error);
    res.status(500).json({ error: "Failed to update smart tracker result" });
  }
});

// PATCH /api/activity/smart-scan/:id/mark-added
// Called when a tool is created from this site
// Requires Pro or Enterprise plan
router.patch("/smart-scan/:id/mark-added", authMiddleware, async (req, res) => {
  try {
    const user = req.user as any;
    const userPlan = (user?.plan || 'free').toLowerCase();

    // Only Pro and Enterprise have access to Smart Tracker
    if (userPlan !== 'pro' && userPlan !== 'enterprise') {
      return res.status(403).json({
        error: "FEATURE_LOCKED",
        message: "Smart Tracker is available on Pro and Enterprise plans only."
      });
    }

    const { id } = req.params;
    const { toolId } = req.body;

    if (!toolId) return res.status(400).json({ error: "Tool ID required" });

    const sites = await storage.getDetectedSites(req.userId!);
    const site = sites.find(s => s.id === id);
    if (!site) return res.status(404).json({ error: "Site not found" });

    const updated = await storage.updateDetectedSite(id, {
      status: 'added',
      toolId: toolId
    });
    res.json({ site: updated });
  } catch (_error) {
    res.status(500).json({ error: "Failed to mark site as added" });
  }
});

export default router;
