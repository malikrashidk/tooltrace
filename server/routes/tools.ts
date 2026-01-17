import { Router } from "express";
import { storage } from "../storage";
import { authMiddleware, emailVerificationMiddleware, auditLog } from "../middleware";
import { insertToolSchema, insertNoteSchema } from "@shared/schema";
import { toCents } from "../../shared/money";
import { calculateNextRenewalDate } from "../lib/date-utils";
import { encrypt, decrypt } from "../lib/crypto";
import { uploadToR2, deleteFromR2, getR2DownloadUrl } from "../lib/r2";
import { z } from "zod";

const router = Router();

// ============ TOOLS ROUTES ============
router.get("/tools", authMiddleware, async (req, res) => {
  try {
    const tools = await storage.getUserTools(req.userId!);
    const user = await storage.getUser(req.userId!);
    const subscription = await storage.getUserSubscription(req.userId!);

    const limit = subscription?.toolsLimit ? parseInt(String(subscription.toolsLimit)) : 10;

    // Handle renewal date rollover for paid tools
    const updatedTools = await Promise.all(tools.map(async (tool) => {
      if (tool.isPaid && tool.nextRenewalDate && tool.billingCycle) {
        const renewalDate = new Date(tool.nextRenewalDate);
        const nextDate = calculateNextRenewalDate(renewalDate, tool.billingCycle);

        if (nextDate.getTime() !== renewalDate.getTime()) {
          console.log(`[Renewal] Rolling over ${tool.name} from ${renewalDate.toLocaleDateString()} to ${nextDate.toLocaleDateString()} `);
          const updated = await storage.updateTool(tool.id, {
            nextRenewalDate: nextDate,
            notified3Days: false,
            notifiedRenewalDay: false
          });
          return updated || tool;
        }
      }
      return tool;
    }));

    // Sort tools by creation date and mark those above the limit as locked
    const sortedTools = [...updatedTools].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const enrichedTools = sortedTools.map((tool, index) => ({
      ...tool,
      isLocked: index >= limit,
      hasCredentials: !!tool.credentials
    }));

    res.json({ tools: enrichedTools, count: enrichedTools.length, limit });
  } catch (error) {
    console.error("[GET /api/tools] Error:", error);
    res.status(500).json({ error: "Failed to fetch tools" });
  }
});

router.post("/tools", authMiddleware, emailVerificationMiddleware, async (req, res) => {
  try {
    let subscription = await storage.getUserSubscription(req.userId!);

    // Auto-create subscription if missing (fallback for edge cases)
    if (!subscription) {
      const user = await storage.getUser(req.userId!);
      const plan = user?.plan || "free";
      const toolsLimit = plan === "enterprise" ? "999999" : plan === "pro" ? "999999" : "10";
      subscription = await storage.createSubscription({
        userId: req.userId!,
        plan,
        toolsLimit,
        status: "active",
      });
    }

    const toolsCount = await storage.getUserToolsCount(req.userId!);
    const toolsLimit = typeof subscription.toolsLimit === "string" ? parseInt(subscription.toolsLimit) : subscription.toolsLimit;
    if (toolsCount >= toolsLimit) {
      return res
        .status(403)
        .json({
          error: `Tool limit reached. Upgrade to Pro or Enterprise for more tools.`,
        });
    }

    const parsed = insertToolSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("[POST /api/tools] Validation error:", parsed.error.errors);
      return res.status(400).json({ error: parsed.error.errors });
    }

    const toolData = {
      ...(parsed.data as any),
      tags: parsed.data.tags || [],
      categories: parsed.data.categories || ["Other"]
    };

    // Convert billingAmount to cents for precision
    if (toolData.billingAmount !== undefined && toolData.billingAmount !== null) {
      toolData.billingAmount = String(toCents(toolData.billingAmount));
    }

    // Encrypt credentials if provided
    if (req.body.username || req.body.password || req.body.email) {
      const credentials = JSON.stringify({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        notes: req.body.notes || req.body.credentialNotes
      });
      toolData.credentials = encrypt(credentials);
    }

    // Encrypt secure note if provided
    if (req.body.secureNote) {
      const encryptedNote = encrypt(req.body.secureNote);
      toolData.secureNote = JSON.stringify(encryptedNote);
    }

    if (req.body.isPinned !== undefined) {
      toolData.isPinned = req.body.isPinned;
    }

    const tool = await storage.createToolWithAudit(req.userId!, {
      ...toolData,
    } as any);

    // Remove sensitive data from response
    const toolResponse = { ...tool, credentials: null, secureNote: !!tool.secureNote };

    res.status(201).json({ tool: toolResponse });
  } catch (error) {
    console.error("[POST /api/tools] Error:", error);
    res.status(500).json({ error: "Failed to create tool" });
  }
});

router.patch("/tools/:id", authMiddleware, emailVerificationMiddleware, async (req, res) => {
  try {
    const tool = await storage.getTool(req.params.id);
    if (!tool || tool.userId !== req.userId) {
      return res.status(404).json({ error: "Tool not found" });
    }

    // Whitelist allowed fields to prevent "column does not exist" errors
    // and to strip out any extra data the frontend might send (like isLocked, user, etc.)
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

    // Convert billingAmount to cents if provided
    if (updates.billingAmount !== undefined && updates.billingAmount !== null) {
      updates.billingAmount = String(toCents(updates.billingAmount));
    }

    // Reset notification flags if nextRenewalDate is manually updated
    if (updates.nextRenewalDate !== undefined) {
      updates.notified3Days = false;
      updates.notifiedRenewalDay = false;
    }

    // Explicitly ensure no sensitive fields leaked into updates
    delete updates.username;
    delete updates.password;
    delete updates.email;
    delete updates.notes;

    // Handle credentials update
    if (req.body.username || req.body.password || req.body.email) {
      const credentials = JSON.stringify({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        notes: req.body.notes || req.body.credentialNotes
      });
      updates.credentials = encrypt(credentials);
    } else if (req.body.credentials === null) {
      // Allow clearing credentials
      updates.credentials = null;
    }

    // Handle secure note update
    if (req.body.secureNote) {
      const encryptedNote = encrypt(req.body.secureNote);
      updates.secureNote = JSON.stringify(encryptedNote);
    } else if (req.body.secureNote === null) {
      updates.secureNote = null;
    }

    const updated = await storage.updateTool(req.params.id, updates);

    if (!updated) {
      return res.status(404).json({ error: "Tool not found after update" });
    }

    // Remove sensitive data
    const toolResponse = { ...updated, credentials: null, secureNote: !!updated.secureNote };

    await auditLog(req.userId, "update", "tool", req.params.id, req.body, req);

    res.json({ tool: toolResponse });
  } catch (error) {
    console.error("Update tool error:", error);
    res.status(500).json({ error: "Failed to update tool" });
  }
});

router.get("/tools/:id/reveal", authMiddleware, async (req, res) => {
  try {
    const tool = await storage.getTool(req.params.id);
    if (!tool || tool.userId !== req.userId) {
      return res.status(404).json({ error: "Tool not found" });
    }

    let revealedCredentials = null;
    let revealedNote = null;

    if (tool.credentials) {
      try {
        const decrypted = decrypt(tool.credentials as any);
        revealedCredentials = JSON.parse(decrypted);
      } catch (e) {
        console.error("Failed to decrypt credentials", e);
      }
    }

    if (tool.secureNote) {
      try {
        const noteData = JSON.parse(tool.secureNote);
        revealedNote = decrypt(noteData);
      } catch (e) {
        console.error("Failed to decrypt note", e);
      }
    }

    res.json({
      credentials: revealedCredentials,
      secureNote: revealedNote
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to reveal secrets" });
  }
});

router.delete("/tools/:id", authMiddleware, emailVerificationMiddleware, async (req, res) => {
  try {
    const tool = await storage.getTool(req.params.id);
    if (!tool || tool.userId !== req.userId) {
      return res.status(404).json({ error: "Tool not found" });
    }

    const success = await storage.deleteToolWithAudit(req.userId!, req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Tool not found or delete failed" });
    }

    res.json({ message: "Tool deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete tool" });
  }
});

// ============ NOTES ROUTES ============
router.get("/notes", authMiddleware, async (req, res) => {
  try {
    const notes = await storage.getUserNotes(req.userId!);
    res.json({ notes });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

router.post("/notes", authMiddleware, emailVerificationMiddleware, async (req, res) => {
  try {
    const validated = insertNoteSchema.parse(req.body);
    const note = await storage.createNote({
      title: validated.title,
      content: validated.content,
      isPinned: validated.isPinned || false,
      userId: req.userId!,
    } as any);
    await auditLog(req.userId!, "create", "note", note.id, { title: note.title }, req);
    res.json({ note });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to create note" });
  }
});

router.patch("/notes/:id", authMiddleware, emailVerificationMiddleware, async (req, res) => {
  try {
    const note = await storage.getNote(req.params.id);
    if (!note || note.userId !== req.userId!) {
      return res.status(404).json({ error: "Note not found" });
    }

    const updates: any = {};
    if (req.body.title !== undefined) {
      updates.title = req.body.title;
    }
    if (req.body.content !== undefined) {
      // Validate content using the schema
      const contentSchema = z.string()
        .min(1, "Note cannot be empty")
        .max(12000, "Note must be less than 1200 words (12,000 characters)")
        .refine(
          (text: string) => text.split(/\s+/).filter(Boolean).length <= 1200,
          "Note must be less than 1200 words"
        );
      updates.content = contentSchema.parse(req.body.content);
    }
    if (req.body.isPinned !== undefined) {
      updates.isPinned = req.body.isPinned;
    }

    const updated = await storage.updateNote(req.params.id, updates);
    await auditLog(req.userId!, "update", "note", req.params.id, updates, req);
    res.json({ note: updated });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to update note" });
  }
});

router.delete("/notes/:id", authMiddleware, emailVerificationMiddleware, async (req, res) => {
  try {
    const note = await storage.getNote(req.params.id);
    if (!note || note.userId !== req.userId!) {
      return res.status(404).json({ error: "Note not found" });
    }

    await storage.deleteNote(req.params.id);
    await auditLog(req.userId!, "delete", "note", req.params.id, { title: note.title }, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// ============ RECEIPT ROUTES (Paid Members Only) ============

// Middleware to check if user has paid plan
const paidPlanMiddleware = async (req: any, res: any, next: any) => {
  try {
    const user = await storage.getUser(req.userId!);
    if (!user) {
      return res.status(403).json({ error: "Receipt storage is only available for Pro and Enterprise plans" });
    }

    // Allow admins regardless of plan
    if (user.isAdmin) {
      return next();
    }

    const plan = (user.plan || "").toString().toLowerCase().trim();
    if (plan !== "pro" && plan !== "enterprise") {
      return res.status(403).json({ error: "Receipt storage is only available for Pro and Enterprise plans" });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Failed to verify subscription" });
  }
};

router.get("/receipts", authMiddleware, paidPlanMiddleware, async (req, res) => {
  try {
    const receipts = await storage.getUserReceipts(req.userId!);
    // Generate signed URLs for each receipt if using R2
    // If running without R2 creds (e.g. dev without env vars), this might fail or return invalid URLs
    // We'll wrap in try/catch or check if it looks like an R2 key
    const receiptsWithUrls = await Promise.all(receipts.map(async (r) => {
      // If it's a data URL (legacy), keep it
      if (r.fileUrl.startsWith("data:")) {
        return r;
      }
      // If it's likely an R2 key (not a URL), generate signed URL
      if (!r.fileUrl.startsWith("http")) {
        try {
          const signedUrl = await getR2DownloadUrl(r.fileUrl);
          return { ...r, fileUrl: signedUrl, originalKey: r.fileUrl };
        } catch (e) {
          // If R2 fails (e.g. not configured), return as is
          return r;
        }
      }
      return r;
    }));
    res.json({ receipts: receiptsWithUrls });
  } catch (error) {
    console.error("Fetch receipts error:", error);
    res.status(500).json({ error: "Failed to fetch receipts" });
  }
});

router.post("/receipts", authMiddleware, paidPlanMiddleware, async (req, res) => {
  try {
    const { fileName, fileData, toolId, amount, receiptDate } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ error: "File name and file data are required" });
    }

    // Validate file type (PDF, PNG, JPG, JPEG)
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({ error: "Only PDF, PNG, JPG, and JPEG files are allowed" });
    }

    // Validate file size (max 5MB)
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    // fileData is base64: "data:image/png;base64,....."
    // Remove header to get actual size
    const base64Content = fileData.split(",")[1] || fileData;
    const sizeInBytes = (base64Content.length * 3) / 4 - (base64Content.indexOf('=') > 0 ? (base64Content.length - base64Content.indexOf('=')) : 0);

    if (sizeInBytes > maxSizeBytes) {
      return res.status(400).json({ error: "File size must be less than 5MB" });
    }

    let storageUrl = fileData; // Default to base64 for fallback

    // Attempt R2 Upload
    if (process.env.R2_BUCKET_NAME) {
      try {
        const buffer = Buffer.from(base64Content, 'base64');
        const contentType = fileData.substring(5, fileData.indexOf(';')) || 'application/octet-stream';
        // Upload returns the key
        const key = await uploadToR2(fileName, buffer, contentType);
        storageUrl = key; // Store the key in DB
      } catch (e) {
        console.error("R2 Upload failed:", e);
        // Strict Fail-Loud Policy: If R2 is configured but fails, DO NOT fallback to database.
        // This ensures the user knows something is wrong with their R2 config or connection.
        return res.status(500).json({ error: "R2 Upload Failed: " + (e as Error).message });
      }
    }

    // Ensure all required fields are set
    const receipt = await storage.createReceipt({
      userId: req.userId!,
      toolId: (toolId && toolId !== 'none' && toolId !== '') ? toolId : null,
      fileName: fileName.trim(),
      fileUrl: storageUrl,
      amount: amount ? String(amount) : null,
      receiptDate: receiptDate ? new Date(receiptDate) : null,
      uploadDate: new Date(),
    });

    await auditLog(req.userId!, "create", "receipt", receipt.id, { fileName }, req);
    res.json({ receipt });
  } catch (error: any) {
    console.error("Receipt upload error:", error);
    if (error.code === '23502' || error.message?.includes('null value')) {
      return res.status(400).json({
        error: `Missing required field.Please ensure all required fields are provided.`
      });
    }
    res.status(500).json({ error: error.message || "Failed to upload receipt" });
  }
});

router.delete("/receipts/:id", authMiddleware, paidPlanMiddleware, async (req, res) => {
  try {
    const receipts = await storage.getUserReceipts(req.userId!);
    const receipt = receipts.find(r => r.id === req.params.id);

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    // Try to delete from R2 if it's not a data URL
    if (!receipt.fileUrl.startsWith("data:") && !receipt.fileUrl.startsWith("http")) {
      try {
        await deleteFromR2(receipt.fileUrl);
      } catch (e) {
        console.error("Failed to delete from R2:", e);
      }
    }

    await storage.deleteReceipt(req.params.id);
    await auditLog(req.userId!, "delete", "receipt", req.params.id, { fileName: receipt.fileName }, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete receipt" });
  }
});

router.post("/tools/match", authMiddleware, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const tools = await storage.getUserTools(req.userId!);
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', '');

    const match = tools.find(t => {
      if (!t.websiteUrl) return false;
      try {
        const toolHostname = new URL(t.websiteUrl.startsWith('http') ? t.websiteUrl : `https://${t.websiteUrl}`).hostname.replace('www.', '');
        return toolHostname === hostname;
      } catch (e) {
        return false;
      }
    });

    if (match) {
      res.json({
        match: {
          ...match,
          credentials: null,
          secureNote: !!match.secureNote,
          hasCredentials: !!match.credentials
        }
      });
    } else {
      res.json({ match: null });
    }
  } catch (error) {
    console.error("Tool match error:", error);
    res.status(500).json({ error: "Match failed" });
  }
});

export default router;
