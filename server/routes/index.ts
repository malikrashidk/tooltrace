import { type Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "../storage";
import { rateLimit } from "../middleware";

import authRoutes from "./auth";
import userRoutes from "./users";
import toolsRoutes from "./tools";
import adminRoutes from "./admin";
import teamRoutes from "./team";
import integrationRoutes from "./integration";
import extensionRoutes from "./extension";
import billingRoutes from "./billing";
import activityRoutes from "./activity";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Apply rate limiting
  app.use("/api/auth", rateLimit(20, 60000, "auth")); // Stricter for auth
  app.use("/api", rateLimit(100, 60000, "general"));
  app.use(passport.initialize());

  // OAuth Configuration
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const OAUTH_CALLBACK_URL = process.env.OAUTH_CALLBACK_URL || "http://localhost:5000";

  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    const callbackURL = process.env.GOOGLE_REDIRECT_URL || `${OAUTH_CALLBACK_URL}/api/auth/google/callback`;

    console.log("[OAuth Setup] Using callback URL:", callbackURL);

    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL,
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
                const updates: any = {
                  googleId: profile.id,
                  oauthProvider: existingUser.oauthProvider || "google",
                  avatarUrl: profile.photos?.[0]?.value || existingUser.avatarUrl,
                };
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
                  toolsLimit: "10",
                });
              }
            }
            done(null, user);
          } catch (_error) {
            done(_error as Error, undefined);
          }
        }
      )
    );
  }

  // Register all routes
  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api", toolsRoutes); // toolsRoutes handles /api/tools, /api/notes, /api/receipts
  app.use("/api/admin", adminRoutes);
  app.use("/api/team", teamRoutes);
  app.use("/api", integrationRoutes); // handles /api/api-keys, /api/v1/*
  app.use("/api/extension", extensionRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/activity", activityRoutes);

  return httpServer;
}
