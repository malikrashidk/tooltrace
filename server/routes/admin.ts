import { Router } from "express";
import { storage } from "../storage";
import { authMiddleware, adminMiddleware, auditLog } from "../middleware";
import { hashPassword } from "../auth";

const router = Router();

router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
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

router.post("/users", authMiddleware, adminMiddleware, async (req, res) => {
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
      toolsLimit: String(plan === "pro" ? 999999 : plan === "enterprise" ? 999999 : 10),
    });

    await auditLog(req.userId!, "create", "user", user.id, { email, name, plan }, req);

    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, plan: user.plan } });
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.delete("/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isAdmin) {
      return res.status(403).json({ error: "Cannot delete admin users" });
    }

    await storage.deleteUser(req.params.id);
    await auditLog(req.userId!, "delete", "user", req.params.id, {}, req);

    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

router.patch("/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
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
      const toolsLimit = String(plan === "pro" ? 999999 : plan === "enterprise" ? 999999 : 10);
      if (subscription) {
        await storage.updateSubscription(subscription.id, { plan, toolsLimit });
      }
    }

    await auditLog(req.userId!, "update", "user", req.params.id, updates, req);

    res.json({ user: { id: updated?.id, email: updated?.email, name: updated?.name, plan: updated?.plan } });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.get("/stats", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    const totalUsers = users.length;
    const totalRevenue = users.reduce((sum, u) => {
      const plan = u.plan;
      // Pro = 9.99/mo, Enterprise = 24.99/mo
      return sum + (plan === "pro" ? 9.99 * 12 : plan === "enterprise" ? 24.99 * 12 : 0);
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

export default router;
