import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authMiddleware, adminMiddleware, rateLimit, auditLog } from "./middleware";
import { hashPassword, verifyPassword, generateToken } from "./auth";
import { insertUserSchema, insertToolSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply global middleware
  app.use(rateLimit(100, 60000)); // 100 requests per minute

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

      const hashedPassword = await hashPassword(parsed.data.password);
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
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
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
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
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
