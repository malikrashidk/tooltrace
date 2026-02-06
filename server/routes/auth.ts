import { Router } from "express";
import passport from "passport";
import crypto from "crypto";
import { storage } from "../storage";
import { authMiddleware, auditLog } from "../middleware";
import { hashPassword, verifyPassword, generateToken } from "../auth";
import { insertUserSchema } from "@shared/schema";
import { generateEmailVerifyToken, hashVerifyToken } from "../emailVerification";
import { sendWelcomeEmail, sendPasswordResetEmail, sendEmailVerificationEmail } from "../emailTemplates";
import {
  generateSecret,
  generateQRCode,
  verifyToken as verify2FAToken,
  generateBackupCodes,
  verifyBackupCode,
} from "../twoFactor";
import { syncUserSubscription } from "../lib/sync-utils";

const router = Router();

// ============ AUTH ROUTES ============
router.post("/register", async (req, res) => {
  try {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    if (parsed.data.password && parsed.data.password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existingUser = await storage.getUserByEmail(parsed.data.email);
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = await hashPassword(parsed.data.password!);

    // Email verification token
    const { raw, hash, expiresAt } = generateEmailVerifyToken();

    // Transactional registration
    const user = await storage.registerUserWithSubscription(
      {
        ...parsed.data,
        password: hashedPassword,
      },
      hash,
      expiresAt,
      {
        plan: "free",
        toolsLimit: "10",
      }
    );

    const verifyUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${raw}`;

    try {
      await sendEmailVerificationEmail(user.email, verifyUrl);
    } catch (e) {
      console.log("Failed to send verification email:", e);
    }

    // Proactive sync for users who bought on branding site before registering
    try {
      await syncUserSubscription(user.id, user.email);
    } catch (syncErr) {
      console.error("[Auth] Background sync failed:", syncErr);
    }

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
  } catch (_error) {
    console.error("Registration error:", _error);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.get("/verify-email", async (req, res) => {
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

    if (user) {
      try {
        await sendWelcomeEmail(user.email, user.name || undefined);
      } catch (e) {
        console.error("Failed to send welcome email:", e);
      }
    }

    return res.redirect("/?verified=true");
  } catch (_error) {
    console.error("verify-email error:", _error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/resend-verification", async (req, res) => {
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
  } catch (_error) {
    console.error("resend-verification error:", _error);
    // Still return ok to avoid enumeration
    return res.json({ ok: true });
  }
});

router.post("/login", async (req, res) => {
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

    // Background sync on login to ensure plan is up to date
    syncUserSubscription(user.id, user.email).catch(err =>
      console.error("[Auth] Login sync failed:", err)
    );

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
  } catch (_error) {
    console.error("Login error:", _error);
    res.status(500).json({ error: "Login failed" });
  }
});

// ============ PASSWORD RESET ROUTES ============
router.post("/forgot-password", async (req, res) => {
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
  } catch (_error) {
    console.error("Forgot password error:", _error);
    res.status(500).json({ error: "Failed to process password reset request" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
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
  } catch (_error) {
    console.error("Reset password error:", _error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

router.get("/verify-reset-token", async (req, res) => {
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
  } catch (_error) {
    console.error("Verify reset token error:", _error);
    res.status(500).json({ valid: false, error: "Failed to verify token" });
  }
});

// ============ OAUTH ROUTES ============
router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: "Google OAuth not configured" });
  }
  const returnTo = req.query.returnTo as string;
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: returnTo,
    prompt: "select_account",
  })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, async (err: any, user: any) => {
    console.log("[OAuth] Google callback received", { err: err?.message, hasUser: !!user });

    if (err || !user) {
      console.log("[OAuth] Authentication failed, redirecting to login with error");
      return res.redirect("/login?error=oauth_failed");
    }

    const handoffCode = await storage.storeHandoffCode(user.id);
    console.log("[OAuth] Handoff code generated for user:", user.email);

    const returnTo = req.query.state as string || "/";
    const redirectUrl = `/login?code=${handoffCode}&returnTo=${encodeURIComponent(returnTo)}`;
    console.log("[OAuth] Redirecting to /login with handoff code");
    res.redirect(redirectUrl);
  })(req, res, next);
});

router.post("/oauth/handoff", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Code is required" });

    const userId = await storage.getHandoffCode(code);
    if (!userId) return res.status(401).json({ error: "Invalid or expired handoff code" });

    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    // Update last login
    await storage.updateUser(user.id, { lastLoginAt: new Date() });

    // Background sync on OAuth handoff
    syncUserSubscription(user.id, user.email).catch(err =>
      console.error("[Auth] OAuth sync failed:", err)
    );

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
  } catch (_error) {
    console.error("[OAuth] Handoff failed:", _error);
    res.status(500).json({ error: "Handoff failed" });
  }
});

// ============ 2FA ROUTES ============
router.post("/2fa/setup", authMiddleware, async (req, res) => {
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
  } catch (_error) {
    console.error("2FA setup error:", _error);
    res.status(500).json({ error: "Failed to setup 2FA" });
  }
});

router.post("/2fa/verify", authMiddleware, async (req, res) => {
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
  } catch (_error) {
    console.error("2FA verify error:", _error);
    res.status(500).json({ error: "Failed to verify 2FA" });
  }
});

router.post("/2fa/disable", authMiddleware, async (req, res) => {
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
  } catch (_error) {
    console.error("2FA disable error:", _error);
    res.status(500).json({ error: "Failed to disable 2FA" });
  }
});

router.get("/2fa/status", authMiddleware, async (req, res) => {
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
  } catch (_error) {
    res.status(500).json({ error: "Failed to get 2FA status" });
  }
});

router.post("/2fa/regenerate-backup", authMiddleware, async (req, res) => {
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
  } catch (_error) {
    res.status(500).json({ error: "Failed to regenerate backup codes" });
  }
});

// Update user profile (currency, language, etc.)
router.patch("/profile", authMiddleware, async (req, res) => {
  console.log(`[ProfileUpdate] Request received from user ${req.userId}`);
  try {
    const updates: any = {};
    if (req.body.currency !== undefined) updates.currency = req.body.currency;
    if (req.body.language !== undefined) updates.language = req.body.language;
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.onboardingStatus !== undefined) updates.onboardingStatus = req.body.onboardingStatus;

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

export default router;
