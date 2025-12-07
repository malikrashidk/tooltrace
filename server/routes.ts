import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { storage } from "./storage";
import { authMiddleware, adminMiddleware, rateLimit, auditLog } from "./middleware";
import { hashPassword, verifyPassword, generateToken } from "./auth";
import { insertUserSchema, insertToolSchema } from "@shared/schema";
import {
  generateSecret,
  generateQRCode,
  verifyToken as verify2FAToken,
  generateBackupCodes,
  verifyBackupCode,
} from "./twoFactor";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply global middleware
  app.use(rateLimit(100, 60000)); // 100 requests per minute
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
                  toolsLimit: "5",
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
                  toolsLimit: "5",
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
        toolsLimit: "5",
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
      console.log("Login attempt:", { email, userFound: !!user, userPassword: !!user?.password });
      
      if (!user) {
        console.log("User not found in storage");
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.password) {
        console.log("User has no password (OAuth only)");
        return res.status(401).json({ error: "Please use Google or Facebook to sign in" });
      }

      const isValid = await verifyPassword(password, user.password);
      console.log("Password verification:", { isValid });
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
      const subscription = await storage.getUserSubscription(req.userId!);
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
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
        return res.status(400).json({ error: parsed.error.errors });
      }

      const tool = await storage.createTool({
        ...parsed.data,
        userId: req.userId!,
      });

      await auditLog(req.userId, "create", "tool", tool.id, {}, req);

      res.status(201).json({ tool });
    } catch (error) {
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
      // TODO: Implement pagination
      res.json({ message: "List all users (TODO)" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/stats", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      // TODO: Implement stats aggregation
      res.json({
        totalUsers: 0,
        totalRevenue: 0,
        activeSubscriptions: 0,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
