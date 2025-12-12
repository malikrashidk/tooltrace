import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { storage } from "./storage";
import { authMiddleware, adminMiddleware, rateLimit, auditLog } from "./middleware";
import { hashPassword, verifyPassword, generateToken } from "./auth";
import { insertUserSchema, insertToolSchema, insertNoteSchema } from "@shared/schema";
import { z } from "zod";
import {
  generateSecret,
  generateQRCode,
  verifyToken as verify2FAToken,
  generateBackupCodes,
  verifyBackupCode,
} from "./twoFactor";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply rate limiting only to API routes
  app.use("/api", rateLimit(100, 60000)); // 100 API requests per minute
  app.use(passport.initialize());

  // ============ OAUTH CONFIGURATION ============
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
  const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
  const OAUTH_CALLBACK_URL = process.env.OAUTH_CALLBACK_URL || "http://localhost:5000";

  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: `${OAUTH_CALLBACK_URL}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByGoogleId(profile.id);
            if (!user) {
              const email = profile.emails?.[0]?.value;
              if (!email) {
                return done(new Error("No email from Google"), undefined);
              }
              const existingUser = await storage.getUserByEmail(email);
              if (existingUser) {
                user = await storage.updateUser(existingUser.id, {
                  googleId: profile.id,
                  oauthProvider: existingUser.oauthProvider || "google",
                  avatarUrl: profile.photos?.[0]?.value || existingUser.avatarUrl,
                });
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

  if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: FACEBOOK_APP_ID,
          clientSecret: FACEBOOK_APP_SECRET,
          callbackURL: `${OAUTH_CALLBACK_URL}/api/auth/facebook/callback`,
          profileFields: ["id", "emails", "name", "displayName", "photos"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByFacebookId(profile.id);
            if (!user) {
              const email = profile.emails?.[0]?.value;
              if (!email) {
                return done(new Error("No email from Facebook"), undefined);
              }
              const existingUser = await storage.getUserByEmail(email);
              if (existingUser) {
                user = await storage.updateUser(existingUser.id, {
                  facebookId: profile.id,
                  oauthProvider: existingUser.oauthProvider || "facebook",
                  avatarUrl: profile.photos?.[0]?.value || existingUser.avatarUrl,
                });
              } else {
                user = await storage.createOAuthUser({
                  email,
                  name: profile.displayName || `${profile.name?.givenName} ${profile.name?.familyName}` || email.split("@")[0],
                  facebookId: profile.id,
                  oauthProvider: "facebook",
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
      console.log(`\n📧 Password Reset Request for ${email}`);
      console.log(`   Reset URL: ${resetUrl}`);
      console.log(`   Token expires: ${resetTokenExpiry.toISOString()}\n`);

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
        return res.redirect("/?error=oauth_failed");
      }
      const token = generateToken(user);
      res.redirect(`/?token=${token}`);
    })(req, res, next);
  });

  app.get("/api/auth/facebook", (req, res, next) => {
    if (!process.env.FACEBOOK_APP_ID) {
      return res.status(503).json({ error: "Facebook OAuth not configured" });
    }
    passport.authenticate("facebook", { scope: ["email"], session: false })(req, res, next);
  });

  app.get("/api/auth/facebook/callback", (req, res, next) => {
    passport.authenticate("facebook", { session: false }, (err: any, user: any) => {
      if (err || !user) {
        return res.redirect("/?error=oauth_failed");
      }
      const token = generateToken(user);
      res.redirect(`/?token=${token}`);
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
        },
        subscription,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // ============ TOOLS ROUTES ============
  app.get("/api/tools", authMiddleware, async (req, res) => {
    try {
      const tools = await storage.getUserTools(req.userId!);
      res.json({ tools, count: tools.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tools" });
    }
  });

  app.post("/api/tools", authMiddleware, async (req, res) => {
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

      // Clean data before passing to storage - ensure empty strings become null/undefined
      const cleanedData = {
        ...parsed.data,
        billingAmount: parsed.data.billingAmount && String(parsed.data.billingAmount) !== "" ? parsed.data.billingAmount : undefined,
        nextRenewalDate: parsed.data.nextRenewalDate || undefined,
        billingCycle: parsed.data.billingCycle && parsed.data.billingCycle !== "" ? parsed.data.billingCycle : undefined,
        paymentMethod: parsed.data.paymentMethod && parsed.data.paymentMethod !== "" ? parsed.data.paymentMethod : undefined,
      };

      const tool = await storage.createTool({
        ...(cleanedData as any),
        userId: req.userId,
      });

      await auditLog(req.userId, "create", "tool", tool.id, {}, req);

      res.status(201).json({ tool });
    } catch (error) {
      console.error("[POST /api/tools] Error:", error);
      res.status(500).json({ error: "Failed to create tool" });
    }
  });

  app.patch("/api/tools/:id", authMiddleware, async (req, res) => {
    try {
      const tool = await storage.getTool(req.params.id);
      if (!tool || tool.userId !== req.userId) {
        return res.status(404).json({ error: "Tool not found" });
      }

      const updated = await storage.updateTool(req.params.id, req.body);
      await auditLog(req.userId, "update", "tool", req.params.id, req.body, req);

      res.json({ tool: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to update tool" });
    }
  });

  app.delete("/api/tools/:id", authMiddleware, async (req, res) => {
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
      res.json({ users });
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

      res.json({
        totalUsers,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        activeSubscriptions: users.filter((u) => u.plan !== "free").length,
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

  app.post("/api/notes", authMiddleware, async (req, res) => {
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

  app.patch("/api/notes/:id", authMiddleware, async (req, res) => {
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

  app.delete("/api/notes/:id", authMiddleware, async (req, res) => {
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
      if (!user || (user.plan !== "standard" && user.plan !== "premium")) {
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

      // Validate file size (max 5MB as base64 string)
      const maxSizeBytes = 5 * 1024 * 1024; // 5MB
      const base64Size = (fileData.length * 3) / 4;
      if (base64Size > maxSizeBytes) {
        return res.status(400).json({ error: "File size must be less than 5MB" });
      }

      // Store the file data as a base64 data URL
      const receipt = await storage.createReceipt({
        userId: req.userId!,
        toolId: toolId || null,
        fileName,
        fileUrl: fileData, // Store base64 data directly
        amount: amount ? String(amount) : null,
        receiptDate: receiptDate ? new Date(receiptDate) : null,
      } as any);

      await auditLog(req.userId!, "create", "receipt", receipt.id, { fileName }, req);
      res.json({ receipt });
    } catch (error: any) {
      console.error("Receipt upload error:", error);
      res.status(400).json({ error: error.message || "Failed to upload receipt" });
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

  const httpServer = createServer(app);
  return httpServer;
}
