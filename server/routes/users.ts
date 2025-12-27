import { Router } from "express";
import { storage } from "../storage";
import { authMiddleware } from "../middleware";

const router = Router();

router.get("/profile", authMiddleware, async (req, res) => {
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

export default router;
