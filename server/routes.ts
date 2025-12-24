import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import archiver from "archiver";
import { storage } from "./storage";
import { authMiddleware, adminMiddleware, emailVerificationMiddleware, rateLimit, auditLog } from "./middleware";
import { hashPassword, verifyPassword, generateToken } from "./auth";
import { insertUserSchema, insertToolSchema, insertNoteSchema } from "@shared/schema";
import { encrypt, decrypt } from "./lib/crypto";
import { generateEmailVerifyToken, hashVerifyToken } from "./emailVerification";
import { sendWelcomeEmail, sendPasswordResetEmail, sendEmailVerificationEmail, sendTeamInvitationEmail } from "./emailTemplates";
import { z } from "zod";
import { getAuthUrl, getTokensFromCode, getClient } from "./lib/google-auth";
import { scanInbox } from "./lib/gmail-scanner";
import { encrypt as encryptToken, decrypt as decryptToken } from "./lib/encryption";
import {
  generateSecret,
  generateQRCode,
  verifyToken as verify2FAToken,
  generateBackupCodes,
  verifyBackupCode,
} from "./twoFactor";
import type { Credentials } from "google-auth-library";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply rate limiting only to API routes
  app.use("/api", rateLimit(100, 60000)); // 100 API requests per minute
  app.use(passport.initialize());

  // ============ OAUTH CONFIGURATION ============
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const OAUTH_CALLBACK_URL = process.env.OAUTH_CALLBACK_URL || "http://localhost:5000";

  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: `${OAUTH_CALLBACK_URL}/api/auth/google/callback`,
        },
        async (accessToken: string, refreshToken: string, profile: any, done: (err: any, user?: any) => void) => {
          try {
            let user = await storage.getUserByGoogleId(profile.id);
            if (!user) {
              const email = profile.emails?.[0]?.value;
              if (!email) {
                return done(new Error("No email from Google"), undefined);
              }
              const existingUser = await storage.getUserByEmail(email);
              if (existingUser) {
                const updates: any = {
                  googleId: profile.id,
                  oauthProvider: existingUser.oauthProvider || "google",
                  avatarUrl: profile.photos?.[0]?.value || existingUser.avatarUrl,
                };
                // Ensure email is marked as verified if they link Google
                if (!existingUser.emailVerifiedAt) {
                  updates.emailVerifiedAt = new Date();
                }
                user = await storage.updateUser(existingUser.id, updates);
              } else {
                user = await storage.createOAuthUser({
                  email,
                  name: profile.displayName || email.split("@")[0],
                  googleId: profile.id,
                  oauthProvider: "google",
                  avatarUrl: profile.photos?.[0]?.value,
                });
                await storage.createSubscription({
                  userId: user!.id,
                  plan: "free",
                  toolsLimit: "8",
                });
              }
            }
            done(null, user);
          } catch (error) {
            done(error as Error, undefined);
          }
        }
      )
    );
  }

  // ============ AUTH ROUTES ============
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }

      const existingUser = await storage.getUserByEmail(parsed.data.email);
      if (existingUser) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const hashedPassword = await hashPassword(parsed.data.password!);
      const user = await storage.createUser({
        ...parsed.data,
        password: hashedPassword,
      });
      // Email verification
      const { raw, hash, expiresAt } = generateEmailVerifyToken();
      await storage.setEmailVerificationToken(user.id, hash, expiresAt);

      const verifyUrl = `${process.env.APP_URL}/api/auth/verify-email?token=${raw}`;

      try {
        console.log("[email-verify] sending to", user.email);
        await sendEmailVerificationEmail(user.email, verifyUrl);
        console.log("[email-verify] sent to", user.email);
      } catch (e) {
        console.error("[email-verify] failed for", user.email, e);
      }


      try {
        await sendWelcomeEmail(user.email, user.name);
      } catch (e) {
        console.error("Welcome email failed:", e);
      }

      // Create default free subscription
      await storage.createSubscription({
        userId: user.id,
        plan: "free",
        toolsLimit: "8",
      });

      await auditLog(user.id, "create", "user", user.id, {}, req);

      const token = generateToken(user);
      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          isAdmin: user.isAdmin,
        },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const token = String(req.query.token || "");
      if (!token) {
        return res.status(400).json({ error: "Missing token" });
      }

      const tokenHash = hashVerifyToken(token);
      const user = await storage.verifyEmailByTokenHash(tokenHash);

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      return res.redirect("/?verified=true");
    } catch (error) {
      console.error("verify-email error:", error);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const email = String(req.body.email || "").trim().toLowerCase();
      if (!email) return res.status(400).json({ error: "Missing email" });

      const user = await storage.getUserByEmail(email);

      // Always return ok to avoid leaking which emails exist
      if (!user) return res.json({ ok: true });
      if (user.emailVerifiedAt) return res.json({ ok: true });

      const { raw, hash, expiresAt } = generateEmailVerifyToken();
      await storage.setEmailVerificationToken(user.id, hash, expiresAt);

      const verifyUrl = `${process.env.APP_URL}/api/auth/verify-email?token=${raw}`;

      try {
        console.log("[email-verify] sending to", user.email);
        await sendEmailVerificationEmail(user.email, verifyUrl);
        console.log("[email-verify] sent to", user.email);
      } catch (e) {
        console.error("[email-verify] failed for", user.email, e);
      }


      return res.json({ ok: true });
    } catch (error) {
      console.error("resend-verification error:", error);
      // Still return ok to avoid enumeration
      return res.json({ ok: true });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, twoFactorCode } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.password) {
        return res.status(401).json({ error: "Please use Google or Facebook to sign in" });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.twoFactorEnabled && user.twoFactorSecret) {
        if (!twoFactorCode) {
          return res.status(200).json({
            requiresTwoFactor: true,
            message: "Two-factor authentication required",
          });
        }

        const isValidCode = verify2FAToken(twoFactorCode, user.twoFactorSecret);
        if (!isValidCode) {
          if (user.twoFactorBackupCodes) {
            const { valid, remainingCodes } = verifyBackupCode(twoFactorCode, user.twoFactorBackupCodes);
            if (valid) {
              await storage.updateUser(user.id, { twoFactorBackupCodes: remainingCodes });
            } else {
              return res.status(401).json({ error: "Invalid two-factor code" });
            }
          } else {
            return res.status(401).json({ error: "Invalid two-factor code" });
          }
        }
      }

      if (!user.emailVerifiedAt) {
        return res.status(403).json({
          error: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email before logging in.",
        });
      }

      // Update last login time
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      await auditLog(user.id, "login", "user", user.id, {}, req);

      const token = generateToken(user);
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          isAdmin: user.isAdmin,
          twoFactorEnabled: user.twoFactorEnabled,
          avatarUrl: user.avatarUrl,
          emailVerifiedAt: user.emailVerifiedAt,
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // ============ PASSWORD RESET ROUTES ============
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account exists with this email, a password reset link has been sent." });
      }

      // OAuth users cannot reset password
      if (user.oauthProvider && !user.password) {
        return res.json({ message: "If an account exists with this email, a password reset link has been sent." });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      await storage.updateUser(user.id, {
        resetToken,
        resetTokenExpiry,
      });

      // In a self-hosted environment, log the reset URL (in production, you'd send an email)
      const resetUrl = `${req.protocol}://${req.get("host")}/reset-password?token=${resetToken}`;
      console.log(`\nðŸ“§ Password Reset Request for ${email}`);
      console.log(`   Reset URL: ${resetUrl}`);
      console.log(`   Token expires: ${resetTokenExpiry.toISOString()}\n`);

      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (e) {
        console.error("Failed to send password reset email:", e);
      }

      await auditLog(user.id, "password_reset_request", "user", user.id, {}, req);

      res.json({
        message: "If an account exists with this email, a password reset link has been sent.",
        // For self-hosted demo purposes, include the reset URL in dev mode
        ...(process.env.NODE_ENV === "development" && { resetUrl })
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const user = await storage.getUserByResetToken(token);

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      await auditLog(user.id, "password_reset", "user", user.id, {}, req);

      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.get("/api/auth/verify-reset-token", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ valid: false, error: "Token is required" });
      }

      const user = await storage.getUserByResetToken(token);

      if (!user) {
        return res.json({ valid: false, error: "Invalid reset token" });
      }

      if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
        return res.json({ valid: false, error: "Reset token has expired" });
      }

      res.json({ valid: true, email: user.email });
    } catch (error) {
      console.error("Verify reset token error:", error);
      res.status(500).json({ valid: false, error: "Failed to verify token" });
    }
  });

  // ============ OAUTH ROUTES ============
  app.get("/api/auth/google", (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: "Google OAuth not configured" });
    }
    passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
  });

  app.get("/api/auth/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, (err: any, user: any) => {
      if (err || !user) {
        return res.redirect("/login?error=oauth_failed");
      }
      const token = generateToken(user);
      // Redirect to /login so the LoginPage can process the token and set it in localStorage
      // LoginPage will then redirect to the intended returnTo path or dashboard
      const urlParams = new URLSearchParams(req.query as any);
      const returnTo = urlParams.get("state") || "/"; // Google strategy can pass state, or we default
      // Note: passport-google-oauth20 supports 'state' parameter but we didn't explicitly set it in the start route.
      // However, usually we just want to get them into the app.
      res.redirect(`/login?token=${token}`);
    })(req, res, next);
  });

  // ============ 2FA ROUTES ============
  app.post("/api/auth/2fa/setup", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.twoFactorEnabled) {
        return res.status(400).json({ error: "2FA is already enabled" });
      }

      const secret = generateSecret();
      const setup = await generateQRCode(user.email, secret);

      await storage.updateUser(user.id, { twoFactorSecret: secret });

      res.json({
        qrCode: setup.qrCode,
        manualCode: setup.manualCode,
      });
    } catch (error) {
      console.error("2FA setup error:", error);
      res.status(500).json({ error: "Failed to setup 2FA" });
    }
  });

  app.post("/api/auth/2fa/verify", authMiddleware, async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Verification code required" });
      }

      const user = await storage.getUser(req.userId!);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ error: "2FA not set up" });
      }

      const isValid = verify2FAToken(code, user.twoFactorSecret);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid verification code" });
      }

      const { codes, hashedCodes } = generateBackupCodes();
      await storage.updateUser(user.id, {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedCodes,
      });

      await auditLog(user.id, "update", "2fa", user.id, { action: "enabled" }, req);

      res.json({
        success: true,
        backupCodes: codes,
        message: "2FA enabled successfully. Save your backup codes!",
      });
    } catch (error) {
      console.error("2FA verify error:", error);
      res.status(500).json({ error: "Failed to verify 2FA" });
    }
  });

  app.post("/api/auth/2fa/disable", authMiddleware, async (req, res) => {
    try {
      const { password, code } = req.body;

      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({ error: "2FA is not enabled" });
      }

      if (user.password) {
        if (!password) {
          return res.status(400).json({ error: "Password required to disable 2FA" });
        }
        const isValidPassword = await verifyPassword(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: "Invalid password" });
        }
      }

      if (!code) {
        return res.status(400).json({ error: "2FA code or backup code required to disable 2FA" });
      }

      if (user.twoFactorSecret) {
        const isValidCode = verify2FAToken(code, user.twoFactorSecret);
        if (!isValidCode) {
          if (user.twoFactorBackupCodes) {
            const { valid } = verifyBackupCode(code, user.twoFactorBackupCodes);
            if (!valid) {
              return res.status(401).json({ error: "Invalid 2FA code" });
            }
          } else {
            return res.status(401).json({ error: "Invalid 2FA code" });
          }
        }
      }

      await storage.updateUser(user.id, {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      });

      await auditLog(user.id, "update", "2fa", user.id, { action: "disabled" }, req);

      res.json({ success: true, message: "2FA disabled successfully" });
    } catch (error) {
      console.error("2FA disable error:", error);
      res.status(500).json({ error: "Failed to disable 2FA" });
    }
  });

  app.get("/api/auth/2fa/status", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        enabled: user.twoFactorEnabled,
        hasBackupCodes: !!(user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0),
        backupCodesRemaining: user.twoFactorBackupCodes?.length || 0,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get 2FA status" });
    }
  });

  app.post("/api/auth/2fa/regenerate-backup", authMiddleware, async (req, res) => {
    try {
      const { password, code } = req.body;

      const user = await storage.getUser(req.userId!);
      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({ error: "2FA is not enabled" });
      }

      if (user.password && password) {
        const isValidPassword = await verifyPassword(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: "Invalid password" });
        }
      }

      if (code && user.twoFactorSecret) {
        const isValidCode = verify2FAToken(code, user.twoFactorSecret);
        if (!isValidCode) {
          return res.status(401).json({ error: "Invalid 2FA code" });
        }
      }

      const { codes, hashedCodes } = generateBackupCodes();
      await storage.updateUser(user.id, { twoFactorBackupCodes: hashedCodes });

      await auditLog(user.id, "update", "2fa", user.id, { action: "regenerate_backup" }, req);

      res.json({
        success: true,
        backupCodes: codes,
        message: "New backup codes generated. Save them securely!",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to regenerate backup codes" });
    }
  });

  // ============ USER ROUTES ============
  app.get("/api/user/profile", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const subscription = await storage.getUserSubscription(req.userId!);
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          isAdmin: user.isAdmin,
          currency: user.currency || "USD",
          language: user.language || "en",
          emailVerifiedAt: user.emailVerifiedAt,
          budgetThreshold: user.budgetThreshold,
        },
        subscription,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Update user profile (currency, language, etc.)
  app.patch("/api/auth/profile", authMiddleware, async (req, res) => {
    console.log(`[ProfileUpdate] Request received from user ${req.userId}`);
    try {
      const updates: any = {};
      if (req.body.currency !== undefined) updates.currency = req.body.currency;
      if (req.body.language !== undefined) updates.language = req.body.language;
      if (req.body.name !== undefined) updates.name = req.body.name;

      // Handle budgetThreshold explicitly to ensure correct type for DB (numeric/string)
      if (req.body.budgetThreshold !== undefined) {
        if (req.body.budgetThreshold === "" || req.body.budgetThreshold === null) {
          updates.budgetThreshold = null;
        } else {
          const val = parseFloat(String(req.body.budgetThreshold));
          updates.budgetThreshold = isNaN(val) ? null : String(val);
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const updated = await storage.updateUser(req.userId!, updates);
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      await auditLog(req.userId!, "update", "user", req.userId!, updates, req);

      res.json({
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          plan: updated.plan,
          isAdmin: updated.isAdmin,
          currency: updated.currency || "USD",
          language: updated.language || "en",
          budgetThreshold: updated.budgetThreshold,
        },
      });
    } catch (error: any) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: error.message || "Failed to update profile" });
    }
  });

  // ============ TOOLS ROUTES ============
  app.get("/api/tools", authMiddleware, async (req, res) => {
    try {
      const tools = await storage.getUserTools(req.userId!);
      const user = await storage.getUser(req.userId!);
      const subscription = await storage.getUserSubscription(req.userId!);

      const limit = subscription?.toolsLimit ? parseInt(String(subscription.toolsLimit)) : 8;

      // Sort tools by creation date and mark those above the limit as locked
      const sortedTools = [...tools].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const enrichedTools = sortedTools.map((tool, index) => ({
        ...tool,
        isLocked: index >= limit
      }));

      res.json({ tools: enrichedTools, count: enrichedTools.length, limit });
    } catch (error) {
      console.error("[GET /api/tools] Error:", error);
      res.status(500).json({ error: "Failed to fetch tools" });
    }
  });

  app.post("/api/tools", authMiddleware, emailVerificationMiddleware, async (req, res) => {
    try {
      let subscription = await storage.getUserSubscription(req.userId!);

      // Auto-create subscription if missing (fallback for edge cases)
      if (!subscription) {
        const user = await storage.getUser(req.userId!);
        const plan = user?.plan || "free";
        const toolsLimit = plan === "premium" ? "999999" : plan === "standard" ? "15" : "8";
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
            error: `Tool limit reached. Upgrade to ${subscription.plan === "free" ? "Standard" : "Premium"} for more tools.`,
          });
      }

      const parsed = insertToolSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("[POST /api/tools] Validation error:", parsed.error.errors);
        return res.status(400).json({ error: parsed.error.errors });
      }

      const toolData = { ...(parsed.data as any) };

      // Encrypt credentials if provided
      if (req.body.username && req.body.password) {
        const credentials = JSON.stringify({
          username: req.body.username,
          password: req.body.password,
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

      const tool = await storage.createTool({
        ...toolData,
        userId: req.userId,
      });

      // Remove sensitive data from response
      const toolResponse = { ...tool, credentials: null, secureNote: !!tool.secureNote };

      await auditLog(req.userId, "create", "tool", tool.id, {}, req);

      res.status(201).json({ tool: toolResponse });
    } catch (error) {
      console.error("[POST /api/tools] Error:", error);
      res.status(500).json({ error: "Failed to create tool" });
    }
  });

  app.patch("/api/tools/:id", authMiddleware, emailVerificationMiddleware, async (req, res) => {
    try {
      const tool = await storage.getTool(req.params.id);
      if (!tool || tool.userId !== req.userId) {
        return res.status(404).json({ error: "Tool not found" });
      }

      const updates = { ...req.body };

      // Handle credentials update
      if (updates.username && updates.password) {
        const credentials = JSON.stringify({
          username: updates.username,
          password: updates.password,
        });
        updates.credentials = encrypt(credentials);
        delete updates.username;
        delete updates.password;
      } else if (updates.username || updates.password) {
        // Partial update - decrypt existing, update field, re-encrypt
        // For simplicity, we require both or assume they are sending the full set.
        // If the user clears fields, we should probably handle that too.
        // For now, let's just handle if 'credentials' is being passed explicitly as null to clear
        if (updates.credentials === null) {
          updates.credentials = null;
        }
      }

      // Handle secure note update
      if (updates.secureNote) {
        const encryptedNote = encrypt(updates.secureNote);
        updates.secureNote = JSON.stringify(encryptedNote);
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

  app.get("/api/tools/:id/reveal", authMiddleware, async (req, res) => {
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

  app.delete("/api/tools/:id", authMiddleware, emailVerificationMiddleware, async (req, res) => {
    try {
      const tool = await storage.getTool(req.params.id);
      if (!tool || tool.userId !== req.userId) {
        return res.status(404).json({ error: "Tool not found" });
      }

      await storage.deleteTool(req.params.id);
      await auditLog(req.userId, "delete", "tool", req.params.id, {}, req);

      res.json({ message: "Tool deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tool" });
    }
  });

  // ============ ADMIN ROUTES ============
  app.get("/api/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Enrich users with tool count
      const usersWithCounts = await Promise.all(users.map(async (user) => {
        const count = await storage.getUserToolsCount(user.id);
        return {
          ...user,
          toolsCount: count
        };
      }));
      res.json({ users: usersWithCounts });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { email, password, name, plan } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, password, and name required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
      });

      // Set user plan after creation
      await storage.updateUser(user.id, { plan: plan || "free" });

      await storage.createSubscription({
        userId: user.id,
        plan: plan || "free",
        status: "active",
        toolsLimit: String(plan === "standard" ? 15 : plan === "premium" ? 999999 : 8),
      });

      await auditLog(req.userId, "create", "user", user.id, { email, name, plan }, req);

      res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan } });
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.delete("/api/admin/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.isAdmin) {
        return res.status(403).json({ error: "Cannot delete admin users" });
      }

      await storage.deleteUser(req.params.id);
      await auditLog(req.userId, "delete", "user", req.params.id, {}, req);

      res.json({ message: "User deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.patch("/api/admin/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { plan, name } = req.body;
      const updates: any = {};

      if (name) updates.name = name;
      if (plan) updates.plan = plan;

      const updated = await storage.updateUser(req.params.id, updates);

      if (plan) {
        const subscription = await storage.getUserSubscription(req.params.id);
        const toolsLimit = String(plan === "standard" ? 15 : plan === "premium" ? 999999 : 8);
        if (subscription) {
          await storage.updateSubscription(subscription.id, { plan, toolsLimit });
        }
      }

      await auditLog(req.userId, "update", "user", req.params.id, updates, req);

      res.json({ user: { id: updated?.id, email: updated?.email, name: updated?.name, plan: updated?.plan } });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const totalUsers = users.length;
      const totalRevenue = users.reduce((sum, u) => {
        const plan = u.plan;
        return sum + (plan === "standard" ? 9.99 * 12 : plan === "premium" ? 19.99 * 12 : 0);
      }, 0);

      // Active users: Logged in within last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeUsers = users.filter(u => {
        if (!u.lastLoginAt) return false;
        return new Date(u.lastLoginAt) > thirtyDaysAgo;
      }).length;

      res.json({
        totalUsers,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        activeSubscriptions: activeUsers, // Using "activeSubscriptions" key for compatibility with frontend, but logic is now active users
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ============ NOTES ROUTES ============
  app.get("/api/notes", authMiddleware, async (req, res) => {
    try {
      const notes = await storage.getUserNotes(req.userId!);
      res.json({ notes });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  app.post("/api/notes", authMiddleware, emailVerificationMiddleware, async (req, res) => {
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

  app.patch("/api/notes/:id", authMiddleware, emailVerificationMiddleware, async (req, res) => {
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

  app.delete("/api/notes/:id", authMiddleware, emailVerificationMiddleware, async (req, res) => {
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
        return res.status(403).json({ error: "Receipt storage is only available for Standard and Premium plans" });
      }

      // Allow admins regardless of plan
      if (user.isAdmin) {
        return next();
      }

      const plan = (user.plan || "").toString().toLowerCase().trim();
      if (plan !== "standard" && plan !== "premium") {
        return res.status(403).json({ error: "Receipt storage is only available for Standard and Premium plans" });
      }
      next();
    } catch (error) {
      res.status(500).json({ error: "Failed to verify subscription" });
    }
  };

  app.get("/api/receipts", authMiddleware, paidPlanMiddleware, async (req, res) => {
    try {
      const receipts = await storage.getUserReceipts(req.userId!);
      res.json({ receipts });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch receipts" });
    }
  });

  app.post("/api/receipts", authMiddleware, paidPlanMiddleware, async (req, res) => {
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

      // Validate file size (max 2MB as base64 string)
      const maxSizeBytes = 2 * 1024 * 1024; // 2MB
      const base64Size = (fileData.length * 3) / 4;
      if (base64Size > maxSizeBytes) {
        return res.status(400).json({ error: "File size must be less than 2MB" });
      }

      // Store the file data as a base64 data URL
      // Ensure all required fields are set
      const receipt = await storage.createReceipt({
        userId: req.userId!,
        toolId: (toolId && toolId !== 'none' && toolId !== '') ? toolId : null,
        fileName: fileName.trim(),
        fileUrl: fileData, // Store base64 data directly
        amount: amount ? String(amount) : null,
        receiptDate: receiptDate ? new Date(receiptDate) : null,
        uploadDate: new Date(), // Explicitly set upload date
      });

      await auditLog(req.userId!, "create", "receipt", receipt.id, { fileName }, req);
      res.json({ receipt });
    } catch (error: any) {
      console.error("Receipt upload error:", error);
      // Check for database constraint violations
      if (error.code === '23502' || error.message?.includes('null value') || error.message?.includes('violates not-null constraint')) {
        const columnMatch = error.message?.match(/column "(\w+)" of relation/);
        const column = columnMatch ? columnMatch[1] : 'unknown';
        return res.status(400).json({
          error: `Missing required field: ${column}. Please ensure all required fields are provided.`
        });
      }
      res.status(500).json({ error: error.message || "Failed to upload receipt" });
    }
  });

  app.delete("/api/receipts/:id", authMiddleware, paidPlanMiddleware, async (req, res) => {
    try {
      const receipts = await storage.getUserReceipts(req.userId!);
      const receipt = receipts.find(r => r.id === req.params.id);

      if (!receipt) {
        return res.status(404).json({ error: "Receipt not found" });
      }

      await storage.deleteReceipt(req.params.id);
      await auditLog(req.userId!, "delete", "receipt", req.params.id, { fileName: receipt.fileName }, req);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete receipt" });
    }
  });

  // ============ API KEYS ROUTES (Paid Members Only) ============

  app.get("/api/api-keys", authMiddleware, paidPlanMiddleware, async (req, res) => {
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

  app.post("/api/api-keys", authMiddleware, paidPlanMiddleware, async (req, res) => {
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

  app.delete("/api/api-keys/:id", authMiddleware, paidPlanMiddleware, async (req, res) => {
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

  // External API: Get all tools
  app.get("/api/v1/tools", apiKeyAuthMiddleware, async (req, res) => {
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
  app.get("/api/v1/tools/:id", apiKeyAuthMiddleware, async (req, res) => {
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
  app.get("/api/v1/renewals", apiKeyAuthMiddleware, async (req, res) => {
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
  app.get("/api/v1/analytics/spending", async (req, res, next) => {
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

  // ============ BROWSER EXTENSION DOWNLOAD ============

  app.get("/api/extension/download", async (req, res) => {
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
    } catch (error) {
      console.error("Extension download error:", error);
      res.status(500).json({ error: "Failed to download extension" });
    }
  });

  // ============ WEBHOOK ENDPOINTS FOR AUTOMATION (Zapier/Make/Pabbly) ============

  // Webhook: Create a new tool
  app.post("/api/v1/tools", apiKeyAuthMiddleware, async (req, res) => {
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
  app.patch("/api/v1/tools/:id", apiKeyAuthMiddleware, async (req, res) => {
    try {
      const tools = await storage.getUserTools(req.userId!);
      const existingTool = tools.find(t => t.id === req.params.id);

      if (!existingTool) {
        return res.status(404).json({ error: "Tool not found" });
      }

      const updates = req.body;
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
  app.delete("/api/v1/tools/:id", apiKeyAuthMiddleware, async (req, res) => {
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

  // Usage Tracking Endpoint (Extension)
  // Accepts either API Key (apiKeyAuthMiddleware) or Session Token (authMiddleware)
  // We can't chain them easily as they are exclusive strategies usually.
  // We'll create a custom hybrid middleware for this specific route or just handle the check inside.
  app.post("/api/tools/usage", async (req, res, next) => {
    // Try API Key first
    if (req.headers.authorization?.startsWith('Bearer tt_')) {
      return apiKeyAuthMiddleware(req, res, next);
    }
    // Try Session Token (authMiddleware)
    return authMiddleware(req, res, next);
  }, async (req: any, res: any) => {
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
      const addedMinutes = Math.floor(durationSeconds / 60);

      if (addedMinutes > 0) {
        await storage.updateTool(toolId, {
          totalUsageTime: String(currentDuration + addedMinutes),
          lastUsedAt: new Date(),
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Usage tracking error:", error);
      res.status(500).json({ error: "Failed to track usage" });
    }
  });

  // ============ TEAM COLLABORATION ROUTES ============
  app.get("/api/team/members", authMiddleware, paidPlanMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get team members (including owner)
      const teamMembers = await storage.getTeamMembers(req.userId!);

      // Add owner as first member
      const ownerMember = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: "owner" as const,
        avatarUrl: user.avatarUrl,
        status: "active" as const,
        joinedAt: user.createdAt,
      };

      res.json({ members: [ownerMember, ...teamMembers] });
    } catch (error: any) {
      console.error("Get team members error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch team members" });
    }
  });

  app.get("/api/team/verify-invite", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') return res.status(400).json({ error: "Missing token" });

      const member = await storage.getTeamMemberByToken(token);
      if (!member) {
        return res.status(404).json({ error: "Invalid invitation" });
      }

      if (member.status === "active") {
        return res.status(400).json({ error: "Invitation already accepted" });
      }

      if (member.invitationExpiresAt && new Date(member.invitationExpiresAt) < new Date()) {
        return res.status(400).json({ error: "Invitation expired" });
      }

      const inviter = await storage.getUser(member.teamOwnerId);

      res.json({
        email: member.email,
        inviterName: inviter?.name || "Unknown",
        teamId: member.teamOwnerId
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/team/accept-invite", authMiddleware, async (req, res) => {
    try {
      const { token } = req.body;
      const member = await storage.getTeamMemberByToken(token);

      if (!member) return res.status(404).json({ error: "Invalid invitation" });
      if (member.email !== (req.user as any)?.email) {
        // For now, let's enforce email match or at least update the member record to the accepting user's ID
        return res.status(403).json({ error: "Email mismatch. Please login with the invited email address." });
      }

      await storage.updateTeamMember(member.id, {
        userId: req.userId!,
        status: "active",
        joinedAt: new Date(),
        invitationToken: null, // clear token so it can't be reused
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/team/register-invite", async (req, res) => {
    try {
      const { token, name, password } = req.body;
      const member = await storage.getTeamMemberByToken(token);
      if (!member) return res.status(404).json({ error: "Invalid invitation" });

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(member.email);
      if (existingUser) return res.status(400).json({ error: "User already exists. Please login to accept." });

      // Create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email: member.email,
        password: hashedPassword,
        name: name,
      });

      // Create default free subscription
      await storage.createSubscription({
        userId: user.id,
        plan: "free",
        toolsLimit: "8",
      });

      // Accept invite
      await storage.updateTeamMember(member.id, {
        userId: user.id,
        status: "active",
        joinedAt: new Date(),
        invitationToken: null,
      });

      // Auto login token not needed here as frontend will call login, but we could return it
      res.json({ success: true });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/team/invite", authMiddleware, paidPlanMiddleware, async (req, res) => {
    try {
      const { email, role } = req.body;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Valid email address is required" });
      }

      if (!["admin", "member", "viewer"].includes(role)) {
        return res.status(400).json({ error: "Invalid role. Must be admin, member, or viewer" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);

      // Check if already a team member
      const existingMembers = await storage.getTeamMembers(req.userId!);
      if (existingMembers.some(m => m.email === email)) {
        return res.status(400).json({ error: "User is already a team member" });
      }

      // Generate invitation token
      const crypto = await import("crypto");
      const invitationToken = crypto.randomBytes(32).toString("hex");
      const invitationExpiresAt = new Date();
      invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7); // 7 days expiry

      const teamMember = await storage.createTeamMember({
        teamOwnerId: req.userId!,
        userId: existingUser?.id || null,
        email,
        role,
        status: existingUser ? "active" : "pending",
        invitedBy: req.userId!,
        invitationToken,
        invitationExpiresAt,
        joinedAt: existingUser ? new Date() : null,
      });

      await auditLog(req.userId!, "create", "team_member", teamMember.id, { email, role }, req);

      const inviteUrl = `${process.env.APP_URL || process.env.OAUTH_CALLBACK_URL || "http://localhost:5000"}/team/accept?token=${invitationToken}`;
      const inviter = await storage.getUser(req.userId!);
      const inviterName = inviter?.name || "A user";

      try {
        await sendTeamInvitationEmail(email, inviteUrl, inviterName);
      } catch (e) {
        console.error("Failed to send team invitation email:", e);
        // Continue anyway, the user can maybe retry or copy link if we return it (dev only?)
      }

      res.json({
        member: teamMember,
        message: "Invitation sent successfully"
      });
    } catch (error: any) {
      console.error("Invite team member error:", error);
      res.status(500).json({ error: error.message || "Failed to invite team member" });
    }
  });

  app.patch("/api/team/members/:id", authMiddleware, paidPlanMiddleware, async (req, res) => {
    try {
      const { role } = req.body;
      const memberId = req.params.id;

      const member = await storage.getTeamMember(memberId);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }

      if (member.teamOwnerId !== req.userId!) {
        return res.status(403).json({ error: "You can only update members of your own team" });
      }

      if (member.role === "owner") {
        return res.status(400).json({ error: "Cannot modify owner role" });
      }

      if (role && !["admin", "member", "viewer"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const updated = await storage.updateTeamMember(memberId, { role });
      await auditLog(req.userId!, "update", "team_member", memberId, { role }, req);

      res.json({ member: updated });
    } catch (error: any) {
      console.error("Update team member error:", error);
      res.status(500).json({ error: error.message || "Failed to update team member" });
    }
  });

  app.delete("/api/team/members/:id", authMiddleware, paidPlanMiddleware, async (req, res) => {
    try {
      const memberId = req.params.id;

      const member = await storage.getTeamMember(memberId);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }

      if (member.teamOwnerId !== req.userId!) {
        return res.status(403).json({ error: "You can only remove members of your own team" });
      }

      if (member.role === "owner") {
        return res.status(400).json({ error: "Cannot remove owner" });
      }

      await storage.deleteTeamMember(memberId);
      await auditLog(req.userId!, "delete", "team_member", memberId, {}, req);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Remove team member error:", error);
      res.status(500).json({ error: error.message || "Failed to remove team member" });
    }
  });

  // Webhook: Get renewal reminders (for automation triggers)
  app.get("/api/v1/webhooks/renewal-triggers", apiKeyAuthMiddleware, async (req, res) => {
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
  app.get("/api/v1/test", apiKeyAuthMiddleware, async (req, res) => {
    res.json({
      success: true,
      message: "API key is valid",
      userId: req.userId,
      timestamp: new Date().toISOString()
    });
  });

  // ============ INBOX DISCOVERY ROUTES ============
  app.get("/api/inbox/google/connect", authMiddleware, (req, res) => {
    try {
      const baseUrl = (process.env.OAUTH_CALLBACK_URL || process.env.APP_URL || "").replace(/\/api\/.*$/, "").replace(/\/$/, "");
      const callbackUrl = `${baseUrl}/api/inbox/google/callback`;
      const url = getAuthUrl(req.userId!, callbackUrl);
      res.json({ url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/inbox/google/callback", async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect("/smart-scan?error=gmail_connect_failed");
    }

    try {
      const baseUrl = (process.env.OAUTH_CALLBACK_URL || process.env.APP_URL || "").replace(/\/api\/.*$/, "").replace(/\/$/, "");
      const callbackUrl = `${baseUrl}/api/inbox/google/callback`;
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

  app.post("/api/inbox/scan", authMiddleware, async (req, res) => {
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

  app.get("/api/inbox/results", authMiddleware, async (req, res) => {
    try {
      const results = await storage.getDiscoveryResults(req.userId!);
      console.log(`[ScanResults] Fetched ${results.length} results for user ${req.userId}`);
      res.json({ results });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch scan results" });
    }
  });

  app.post("/api/inbox/results/clear", authMiddleware, async (req, res) => {
    try {
      await storage.clearDiscoveryResults(req.userId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to clear results" });
    }
  });

  app.post("/api/inbox/disconnect", authMiddleware, async (req, res) => {
    try {
      await storage.deleteOAuthConnection(req.userId!, "google");
      await storage.clearDiscoveryResults(req.userId!);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to disconnect account" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

