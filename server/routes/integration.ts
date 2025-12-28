import { Router } from "express";
import { storage } from "../storage";
import { authMiddleware, auditLog } from "../middleware";
import crypto from "crypto";

const router = Router();

// Middleware to check if user has paid plan
const paidPlanMiddleware = async (req: any, res: any, next: any) => {
  try {
    const user = await storage.getUser(req.userId!);
    if (!user) {
      return res.status(403).json({ error: "API access is only available for Standard and Premium plans" });
    }

    // Allow admins regardless of plan
    if (user.isAdmin) {
      return next();
    }

    const plan = (user.plan || "").toString().toLowerCase().trim();
    if (plan !== "standard" && plan !== "premium") {
      return res.status(403).json({ error: "API access is only available for Standard and Premium plans" });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Failed to verify subscription" });
  }
};

// Middleware to verify API key for external access AND check paid plan
const apiKeyAuthMiddleware = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Missing or invalid API key" });
    }

    const key = authHeader.substring(7);
    const apiKey = await storage.getApiKeyByKey(key);

    if (!apiKey || !apiKey.isActive) {
      return res.status(401).json({ error: "Invalid or inactive API key" });
    }

    // Verify user still has a paid plan (API access requires Standard or Premium)
    const user = await storage.getUser(apiKey.userId);
    if (!user || (user.plan !== "standard" && user.plan !== "premium")) {
      return res.status(403).json({ error: "API access requires an active Standard or Premium subscription" });
    }

    // Store user ID from API key for route handlers
    req.userId = apiKey.userId;
    req.apiKeyId = apiKey.id;
    next();
  } catch (error) {
    res.status(500).json({ error: "API authentication failed" });
  }
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
  } catch (error) {
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

    const apiKey = await storage.createApiKey({
      userId: req.userId!,
      name: name.trim(),
      key,
      secret,
    } as any);

    await auditLog(req.userId!, "create", "api_key", apiKey.id, { name: apiKey.name }, req);

    // Return full key and secret only on creation
    res.json({
      apiKey: {
        ...apiKey,
        // Note: this is the only time secret is visible
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
  } catch (error) {
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
  } catch (error) {
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
    res.json({ tool });
  } catch (error) {
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
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch renewals" });
  }
});

// External API: Get spending analytics
router.get("/v1/analytics/spending", async (req, res, next) => {
  // Try session auth first, fall back to API key
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return authMiddleware(req, res, next);
  }
  return apiKeyAuthMiddleware(req, res, next);
}, async (req, res) => {
  try {
    const tools = await storage.getUserTools(req.userId!);

    const monthlyTotal = tools.reduce((sum, tool) => {
      if (tool.billingAmount && tool.billingCycle === "monthly") {
        return sum + parseFloat(tool.billingAmount);
      }
      if (tool.billingAmount && tool.billingCycle === "yearly") {
        return sum + parseFloat(tool.billingAmount) / 12;
      }
      return sum;
    }, 0);

    const yearlyTotal = monthlyTotal * 12;
    const byCategory = tools.reduce((acc: Record<string, number>, tool) => {
      const category = tool.categories?.[0] || "Uncategorized";
      const monthly = tool.billingCycle === "yearly"
        ? parseFloat(tool.billingAmount || "0") / 12
        : parseFloat(tool.billingAmount || "0");
      acc[category] = (acc[category] || 0) + monthly;
      return acc;
    }, {});

    const user = await storage.getUser(req.userId!);
    const budgetThreshold = user?.budgetThreshold ? parseFloat(user.budgetThreshold) : null;
    const budgetStatus = budgetThreshold
      ? {
        threshold: budgetThreshold,
        isOverBudget: monthlyTotal > budgetThreshold,
        percentageUsed: (monthlyTotal / budgetThreshold) * 100
      }
      : null;

    res.json({
      monthlyTotal: monthlyTotal.toFixed(2),
      yearlyTotal: yearlyTotal.toFixed(2),
      toolCount: tools.length,
      byCategory,
      budgetStatus
    });
  } catch (error) {
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
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch renewal triggers" });
  }
});

// Webhook: Test endpoint to verify API key
router.get("/v1/test", apiKeyAuthMiddleware, async (req, res) => {
  res.json({
    success: true,
    message: "API key is valid",
    userId: req.userId,
    timestamp: new Date().toISOString()
  });
});

export { apiKeyAuthMiddleware };
export default router;
