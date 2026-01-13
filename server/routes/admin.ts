import { Router } from "express";
import { storage } from "../storage";
import { authMiddleware, adminMiddleware, auditLog } from "../middleware";
import { hashPassword } from "../auth";

const router = Router();

router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Get pagination params
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100
    const offset = parseInt(req.query.offset as string) || 0;

    const users = await storage.getAllUsers();
    const total = users.length;
    
    // Apply pagination
    const paginatedUsers = users.slice(offset, offset + limit);
    
    // Enrich users with tool count
    const usersWithCounts = await Promise.all(paginatedUsers.map(async (user) => {
      const count = await storage.getUserToolsCount(user.id);
      return {
        ...user,
        toolsCount: count
      };
    }));
    
    res.json({ 
      users: usersWithCounts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
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
    const stats = await storage.getGlobalStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/audit-logs", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const logs = await storage.getAuditLogs(limit, offset);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

router.post("/users/:id/suspend", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { suspended } = req.body;
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isAdmin) {
      return res.status(403).json({ error: "Cannot suspend admin users" });
    }

    await storage.suspendUser(req.params.id, suspended);
    await auditLog(req.userId!, suspended ? "suspend" : "unsuspend", "user", req.params.id, {}, req);

    res.json({ message: `User ${suspended ? 'suspended' : 'unsuspended'} successfully` });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user status" });
  }
});

export default router;
