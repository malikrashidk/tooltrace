import { Router } from "express";
import { storage } from "../storage";
import { authMiddleware } from "../middleware";
import { getAuthUrl, getTokensFromCode, getClient } from "../lib/google-auth";
import { scanInbox } from "../lib/gmail-scanner";
import { encrypt as encryptToken, decrypt as decryptToken } from "../lib/encryption";

const router = Router();

// ============ INBOX DISCOVERY ROUTES ============
router.get("/connection-status", authMiddleware, async (req, res) => {
  try {
    const connection = await storage.getOAuthConnection(req.userId!, "google");
    res.json({ connected: !!connection });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/google/connect", authMiddleware, (req, res) => {
  try {
    // If OAUTH_CALLBACK_URL already contains the callback path, use it directly
    // Otherwise, construct it from the base URL
    let callbackUrl = process.env.OAUTH_CALLBACK_URL || "";

    if (!callbackUrl.includes("/api/inbox/google/callback")) {
      const baseUrl = (process.env.APP_URL || "").replace(/\/$/, "");
      callbackUrl = `${baseUrl}/api/inbox/google/callback`;
    }

    const url = getAuthUrl(req.userId!, callbackUrl);
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/google/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.redirect("/smart-scan?error=gmail_connect_failed");
  }

  try {
    // Use the same URL construction logic as the connect endpoint
    let callbackUrl = process.env.OAUTH_CALLBACK_URL || "";

    if (!callbackUrl.includes("/api/inbox/google/callback")) {
      const baseUrl = (process.env.APP_URL || "").replace(/\/$/, "");
      callbackUrl = `${baseUrl}/api/inbox/google/callback`;
    }

    const tokens = await getTokensFromCode(code as string, callbackUrl);

    const accessTokenEnc = encryptToken(tokens.access_token || "");
    const refreshTokenEnc = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;

    // Upsert OAuth connection
    const userId = state as string;
    const existing = await storage.getOAuthConnection(userId, "google");
    if (existing) {
      await storage.updateOAuthConnection(existing.id, {
        accessTokenEnc,
        refreshTokenEnc: refreshTokenEnc || existing.refreshTokenEnc,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scope: tokens.scope || existing.scope,
      });
    } else {
      await storage.createOAuthConnection({
        userId: userId,
        provider: "google",
        accessTokenEnc,
        refreshTokenEnc,
        scope: tokens.scope || "",
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      });
    }

    res.redirect("/smart-scan?gmail_connected=true");
  } catch (error) {
    console.error("Gmail callback error:", error);
    res.redirect("/smart-scan?error=gmail_connect_failed");
  }
});

router.post("/scan", authMiddleware, async (req, res) => {
  try {
    const user = await storage.getUser(req.userId!);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Monthly limit check
    const runCount = await storage.getDiscoveryRunsThisMonth(user.id);
    const userPlan = (user.plan || "free").toLowerCase();
    const limits: Record<string, number> = { free: 1, standard: 10, premium: 50 };

    if (runCount >= (limits[userPlan] || 1)) {
      return res.status(403).json({
        error: `Monthly scan limit reached for your ${userPlan} plan.`
      });
    }

    console.log(`[Scan] Starting scan for user ${user.id}`);
    const conn = await storage.getOAuthConnection(user.id, "google");
    if (!conn) {
      console.log(`[Scan] No OAuth connection found for user ${user.id}`);
      return res.status(400).json({ error: "Please connect your Gmail account first" });
    }

    console.log(`[Scan] Found OAuth connection, decrypting tokens...`);
    let access_token, refresh_token;
    try {
      access_token = decryptToken(conn.accessTokenEnc);
      refresh_token = conn.refreshTokenEnc ? decryptToken(conn.refreshTokenEnc) : undefined;
      console.log(`[Scan] Tokens decrypted successfully`);
    } catch (e: any) {
      console.error(`[Scan] Token decryption failed for user ${user.id}:`, e.message);
      return res.status(500).json({ error: "Authentication token decryption failed. Please reconnect your Gmail." });
    }

    const auth = getClient({
      access_token,
      refresh_token,
      expiry_date: conn.tokenExpiry ? new Date(conn.tokenExpiry).getTime() : undefined,
    });

    console.log(`[Scan] Initiating Gmail API scan...`);

    // Log run start
    const run = await storage.createDiscoveryRun({
      userId: user.id,
      provider: "google",
      status: "running",
      });

    console.log(`[Scan] Discovery run ${run.id} started`);
    const suggestions = await scanInbox(auth);
    console.log(`[Scan] Scan completed, found ${suggestions.length} suggestions`);

    // Update results
    await storage.clearDiscoveryResults(user.id);
    for (const suggestion of suggestions) {
      await storage.createDiscoveryResult({
        ...suggestion,
        userId: user.id,
        provider: "google",
      });
    }

    // Finalize run
    await storage.updateDiscoveryRun(run.id, {
      status: "completed",
      finishedAt: new Date(),
      itemsFoundCount: suggestions.length,
    });

    console.log(`[Scan] Discovery run ${run.id} finalized successfully. Found ${suggestions.length} items.`);

    // Fetch the mapped results to ensure they match what the frontend expects
    const finalResults = await storage.getDiscoveryResults(user.id);

    res.json({
      success: true,
      count: suggestions.length,
      results: finalResults
    });
  } catch (error: any) {
    console.error("[Scan] Fatal error during inbox scan:", error);
    res.status(500).json({ error: `Failed to scan inbox: ${error.message}` });
  }
});

router.get("/results", authMiddleware, async (req, res) => {
  try {
    const results = await storage.getDiscoveryResults(req.userId!);
    console.log(`[ScanResults] Fetched ${results.length} results for user ${req.userId}`);
    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch scan results" });
  }
});

router.post("/results/clear", authMiddleware, async (req, res) => {
  try {
    await storage.clearDiscoveryResults(req.userId!);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to clear results" });
  }
});

router.post("/disconnect", authMiddleware, async (req, res) => {
  try {
    await storage.deleteOAuthConnection(req.userId!, "google");
    await storage.clearDiscoveryResults(req.userId!);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to disconnect account" });
  }
});

export default router;
