import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authMiddleware, auditLog } from "../middleware";
import crypto from "crypto";
import { hashPassword, verifyPassword } from "../auth";
import path from "path";
import fs from "fs";

const router = Router();

// Middleware to check if user has paid plan
const paidPlanMiddleware = async (req: any, res: any, next: any) => {
  try {
    const user = await storage.getUser(req.userId!);
    if (!user) {
      return res.status(403).json({ error: "API access is exclusively available for the Enterprise plan" });
    }

    // Allow admins regardless of plan
    if (user.isAdmin) {
      return next();
    }

    const plan = (user.plan || "").toString().toLowerCase().trim();
    if (plan !== "enterprise") {
      return res.status(403).json({ error: "API access is exclusively available for the Enterprise plan" });
    }
    next();
  } catch (_error) {
    res.status(500).json({ error: "Failed to verify subscription" });
  }
};

// Middleware to verify API key for external access AND check paid plan
const apiKeyAuthMiddleware = async (req: any, res: any, next: any) => {
  try {
    let authValue = "";
    const authHeader = req.headers.authorization;

    // 1. Try Authorization Header (Bearer token)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authValue = authHeader.substring(7);
    }
    // 2. Try Query Parameter (fallback for simpler integrations)
    else if (req.query.apiKey) {
      authValue = req.query.apiKey as string;
    }

    if (!authValue) {
      return res.status(401).json({ error: "Missing or invalid API key. Provide via Bearer token or ?apiKey= query param." });
    }

    const [key, providedSecret] = authValue.includes('.') ? authValue.split('.') : [authValue, null];

    const apiKey = await storage.getApiKeyByKey(key);

    if (!apiKey || !apiKey.isActive) {
      return res.status(401).json({ error: "Invalid or inactive API key" });
    }

    // Verify secret if it was hashed
    if (providedSecret) {
      const isValid = await verifyPassword(providedSecret, apiKey.secret);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid API secret" });
      }
    } else if (apiKey.secret.includes(':')) {
      // If the stored secret is hashed but no secret was provided
      return res.status(401).json({ error: "API secret missing in token. Format should be key.secret" });
    }

    // Verify user still has a paid plan (API access requires Enterprise)
    const user = await storage.getUser(apiKey.userId);
    const plan = (user?.plan || "").toString().toLowerCase().trim();
    if (!user || (plan !== "enterprise" && !user.isAdmin)) {
      return res.status(403).json({ error: "API access requires an active Enterprise subscription" });
    }

    // Store user info and key info for route handlers
    req.userId = apiKey.userId;
    req.user = user;
    req.apiKeyId = apiKey.id;
    next();
  } catch (_error) {
    console.error("[API Auth] Middleware error:", _error);
    res.status(500).json({ error: "API authentication failed" });
  }
};

/**
 * Middleware that handles both session AND API key authentication.
 * Useful for endpoints used by both the dashboard and external integrations.
 */
const flexibleAuthMiddleware = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  // 1. If it looks like an API key (starts with 'tt_'), use apiKeyAuthMiddleware
  if (authHeader?.startsWith('Bearer tt_') || req.query.apiKey) {
    return apiKeyAuthMiddleware(req, res, next);
  }

  // 2. Otherwise try standard session auth (JWT)
  return authMiddleware(req, res, next);
};

router.get("/api-keys", authMiddleware, paidPlanMiddleware, async (req, res) => {
  try {
    const apiKeys = await storage.getUserApiKeys(req.userId!);
    // Don't return the secret, only show it once when created
    const safeApiKeys = apiKeys.map(key => ({
      ...key,
      secret: "â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢", // Hide secret
    }));
    res.json({ apiKeys: safeApiKeys });
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch API keys" });
  }
});

router.post("/api-keys", authMiddleware, paidPlanMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "API key name is required" });
    }

    // Check limit (max 5 API keys per user)
    const existingKeys = await storage.getUserApiKeys(req.userId!);
    if (existingKeys.length >= 5) {
      return res.status(400).json({ error: "Maximum 5 API keys allowed per user" });
    }

    // Generate key and secret
    const key = `tt_${crypto.randomBytes(16).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');
    const hashedSecret = await hashPassword(secret);

    const apiKey = await storage.createApiKey({
      userId: req.userId!,
      name: name.trim(),
      key,
      secret: hashedSecret,
    } as any);

    await auditLog(req.userId!, "create", "api_key", apiKey.id, { name: apiKey.name }, req);

    // Return full key and secret only on creation
    res.json({
      apiKey: {
        ...apiKey,
        secret: secret, // Show the raw secret once
        token: `${key}.${secret}` // Provide the combined token for convenience
      },
      message: "Save the key and secret now. The secret will not be shown again."
    });
  } catch (error: any) {
    console.error("API key creation error:", error);
    res.status(400).json({ error: error.message || "Failed to create API key" });
  }
});

router.delete("/api-keys/:id", authMiddleware, paidPlanMiddleware, async (req, res) => {
  try {
    const apiKeys = await storage.getUserApiKeys(req.userId!);
    const apiKey = apiKeys.find(k => k.id === req.params.id);

    if (!apiKey) {
      return res.status(404).json({ error: "API key not found" });
    }

    await storage.deleteApiKey(req.params.id);
    await auditLog(req.userId!, "delete", "api_key", req.params.id, { name: apiKey.name }, req);
    res.json({ success: true });
  } catch (_error) {
    res.status(500).json({ error: "Failed to delete API key" });
  }
});

// ============ EXTERNAL API ENDPOINTS (for Pabbly/Make integrations) ============

// External API: Get all tools
router.get("/v1/tools", apiKeyAuthMiddleware, async (req, res) => {
  try {
    const tools = await storage.getUserTools(req.userId!);
    // Sanitize tools to remove raw encrypted blobs from list view
    const sanitizedTools = tools.map(t => ({
      ...t,
      credentials: null,
      secureNote: !!t.secureNote, // just return boolean indicating existence
      hasCredentials: !!t.credentials
    }));
    res.json({ tools: sanitizedTools, count: tools.length });
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch tools" });
  }
});

// External API: Get tool by ID
router.get("/v1/tools/:id", apiKeyAuthMiddleware, async (req, res) => {
  try {
    const tool = await storage.getTool(req.params.id);
    if (!tool || tool.userId !== req.userId!) {
      return res.status(404).json({ error: "Tool not found" });
    }
    // Sanitize
    const { credentials: _credentials, ...sanitizedTool } = tool;
    res.json({ tool: sanitizedTool });
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch tool" });
  }
});

// External API: Get upcoming renewals
router.get("/v1/renewals", apiKeyAuthMiddleware, async (req, res) => {
  try {
    const tools = await storage.getUserTools(req.userId!);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingRenewals = tools
      .filter(tool => {
        if (!tool.nextRenewalDate) return false;
        const renewalDate = new Date(tool.nextRenewalDate);
        return renewalDate >= today && renewalDate <= thirtyDaysFromNow;
      })
      .sort((a, b) => new Date(a.nextRenewalDate!).getTime() - new Date(b.nextRenewalDate!).getTime());

    res.json({ renewals: upcomingRenewals, count: upcomingRenewals.length });
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch renewals" });
  }
});

// External API: Get spending analytics
router.get("/v1/analytics/spending", flexibleAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const tools = await storage.getUserTools(req.userId!);

    const monthlyTotalCents = tools.reduce((sum, tool) => {
      const amountCents = parseInt(String(tool.billingAmount || "0"));
      if (amountCents > 0 && tool.billingCycle === "monthly") {
        return sum + amountCents;
      }
      if (amountCents > 0 && tool.billingCycle === "yearly") {
        return sum + Math.round(amountCents / 12);
      }
      return sum;
    }, 0);
    const monthlyTotal = monthlyTotalCents / 100;
    const yearlyTotal = monthlyTotal * 12;

    const byCategory: Record<string, number> = {};
    tools.forEach(tool => {
      const category = tool.categories?.[0] || "Uncategorized";
      const amountCents = parseInt(String(tool.billingAmount || "0"));
      let monthlyCents = 0;
      if (amountCents > 0) {
        monthlyCents = tool.billingCycle === "yearly" ? Math.round(amountCents / 12) : amountCents;
      }
      byCategory[category] = (byCategory[category] || 0) + (monthlyCents / 100);
    });

    const user = await storage.getUser(req.userId!);
    // Assuming budgetThreshold is stored as a decimal string in DB for now, or already converted to decimal if using a mapper
    // But since we are doing cent-based math, let's assume it might be cents soon.
    // For now, let's treat it as decimal if it has "." otherwise cents? No, let's stick to decimal for user settings if they haven't been refactored.
    const budgetThreshold = user?.budgetThreshold ? parseFloat(user.budgetThreshold) : null;

    const isOverBudget = budgetThreshold !== null && monthlyTotal > budgetThreshold;
    const percentageUsed = budgetThreshold ? (monthlyTotal / budgetThreshold) * 100 : 0;

    res.json({
      tools: tools.map(t => ({ ...t, credentials: null })),
      monthlyTotal: monthlyTotal.toFixed(2),
      yearlyTotal: yearlyTotal.toFixed(2),
      byCategory,
      budgetStatus: {
        threshold: budgetThreshold,
        isOverBudget,
        percentageUsed
      }
    });
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// Webhook: Create a new tool
router.post("/v1/tools", apiKeyAuthMiddleware, async (req, res) => {
  try {
    const { name, websiteUrl, isPaid, billingAmount, billingCycle, categories, usageFrequency, nextRenewalDate, notes } = req.body;

    if (!name || !websiteUrl) {
      return res.status(400).json({ error: "Name and websiteUrl are required" });
    }

    const tool = await storage.createTool({
      userId: req.userId!,
      name,
      websiteUrl,
      isPaid: isPaid || false,
      billingAmount: billingAmount || undefined,
      billingCycle: billingCycle || undefined,
      categories: categories || [],
      usageFrequency: usageFrequency || "daily",
      nextRenewalDate: nextRenewalDate ? new Date(nextRenewalDate) : undefined,
      notes: notes || undefined,
      logoUrl: undefined,
      paymentMethod: undefined,
      tags: [],
      credentials: undefined,
    });

    await auditLog(req.userId!, "create", "tool", tool.id, { name: tool.name, source: "api" }, req);
    res.status(201).json({ tool, message: "Tool created successfully" });
  } catch (error: any) {
    console.error("API tool creation error:", error);
    res.status(400).json({ error: error.message || "Failed to create tool" });
  }
});

// Webhook: Update a tool
router.patch("/v1/tools/:id", apiKeyAuthMiddleware, async (req, res) => {
  try {
    const tools = await storage.getUserTools(req.userId!);
    const existingTool = tools.find(t => t.id === req.params.id);

    if (!existingTool) {
      return res.status(404).json({ error: "Tool not found" });
    }

    // Whitelist allowed fields to prevent "column does not exist" errors
    const allowedFields = [
      "name", "websiteUrl", "logoUrl", "notes", "isPaid",
      "billingAmount", "billingCycle", "nextRenewalDate",
      "categories", "tags", "usageFrequency", "paymentMethod",
      "isPinned", "lastUsedAt", "totalUsageTime"
    ];

    const updates: any = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (updates.nextRenewalDate) {
      updates.nextRenewalDate = new Date(updates.nextRenewalDate);
    }

    const updatedTool = await storage.updateTool(req.params.id, updates);
    await auditLog(req.userId!, "update", "tool", req.params.id, { source: "api", changes: Object.keys(updates) }, req);

    res.json({ tool: updatedTool, message: "Tool updated successfully" });
  } catch (error: any) {
    console.error("API tool update error:", error);
    res.status(400).json({ error: error.message || "Failed to update tool" });
  }
});

// Webhook: Delete a tool
router.delete("/v1/tools/:id", apiKeyAuthMiddleware, async (req, res) => {
  try {
    const tools = await storage.getUserTools(req.userId!);
    const existingTool = tools.find(t => t.id === req.params.id);

    if (!existingTool) {
      return res.status(404).json({ error: "Tool not found" });
    }

    await storage.deleteTool(req.params.id);
    await auditLog(req.userId!, "delete", "tool", req.params.id, { name: existingTool.name, source: "api" }, req);

    res.json({ success: true, message: "Tool deleted successfully" });
  } catch (error: any) {
    console.error("API tool deletion error:", error);
    res.status(400).json({ error: error.message || "Failed to delete tool" });
  }
});

// Webhook: Get renewal reminders (for automation triggers)
router.get("/v1/webhooks/renewal-triggers", apiKeyAuthMiddleware, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const tools = await storage.getUserTools(req.userId!);
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    const upcomingRenewals = tools
      .filter(tool => {
        if (!tool.nextRenewalDate || !tool.isPaid) return false;
        const renewalDate = new Date(tool.nextRenewalDate);
        return renewalDate >= today && renewalDate <= futureDate;
      })
      .map(tool => ({
        toolId: tool.id,
        toolName: tool.name,
        renewalDate: tool.nextRenewalDate,
        amount: tool.billingAmount,
        billingCycle: tool.billingCycle,
        daysUntilRenewal: Math.ceil((new Date(tool.nextRenewalDate!).getTime() - today.getTime()) / (24 * 60 * 60 * 1000)),
      }));

    res.json({
      renewals: upcomingRenewals,
      count: upcomingRenewals.length,
      queryDays: days,
      generatedAt: new Date().toISOString()
    });
  } catch (_error) {
    res.status(500).json({ error: "Failed to fetch renewal triggers" });
  }
});

// Webhook: Get API Documentation
router.get("/v1/docs", async (req, res) => {
  try {
    const docsPath = path.join(process.cwd(), "DOCS_API.md");
    if (fs.existsSync(docsPath)) {
      const docs = fs.readFileSync(docsPath, "utf-8");
      res.setHeader("Content-Type", "text/markdown");
      res.send(docs);
    } else {
      res.status(404).json({ error: "Documentation not found" });
    }
  } catch (_error) {
    res.status(500).json({ error: "Failed to load documentation" });
  }
});

export { apiKeyAuthMiddleware, flexibleAuthMiddleware };
export default router;
