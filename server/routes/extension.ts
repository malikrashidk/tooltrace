import { Router } from "express";
import { storage } from "../storage";
import { flexibleAuthMiddleware } from "./integration";
import path from "path";
import fs from "fs";
import archiver from "archiver";

const router = Router();

// ============ BROWSER EXTENSION DOWNLOAD ============
router.get("/download", async (req, res) => {
  try {
    const extensionPath = path.join(process.cwd(), "browser-extension");

    // Check if browser-extension folder exists
    if (!fs.existsSync(extensionPath)) {
      return res.status(404).json({ error: "Extension files not found" });
    }

    // Set headers for zip download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="tooltrace-extension.zip"');

    // Create zip archive
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err: any) => {
      console.error("Archive error:", err);
      res.status(500).json({ error: "Failed to create extension archive" });
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add browser-extension folder contents to archive
    archive.directory(extensionPath, false);

    // Finalize archive
    await archive.finalize();
  } catch (_error) {
    console.error("Extension download error:", _error);
    res.status(500).json({ error: "Failed to download extension" });
  }
});

// Usage Tracking Endpoint (Extension)
// Accepts either API Key or Session Token
router.post("/usage", flexibleAuthMiddleware, async (req: any, res: any) => {
  try {
    const { toolId, durationSeconds } = req.body;

    if (!toolId || !durationSeconds) {
      return res.status(400).json({ error: "toolId and durationSeconds are required" });
    }

    const tool = await storage.getTool(toolId);
    if (!tool || tool.userId !== req.userId!) {
      return res.status(404).json({ error: "Tool not found" });
    }

    const currentDuration = parseInt(tool.totalUsageTime || "0");
    const addedMinutes = Math.ceil(durationSeconds / 60);

    if (addedMinutes > 0) {
      await storage.updateTool(toolId, {
        totalUsageTime: String(currentDuration + addedMinutes),
        lastUsedAt: new Date(),
      });
    }

    res.json({ success: true });
  } catch (_error) {
    console.error("Usage tracking error:", _error);
    res.status(500).json({ error: "Failed to track usage" });
  }
});

export default router;
