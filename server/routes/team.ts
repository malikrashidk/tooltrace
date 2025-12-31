import { Router } from "express";
import { storage } from "../storage";
import { authMiddleware, auditLog } from "../middleware";
import { sendTeamInvitationEmail } from "../emailTemplates";
import { hashPassword } from "../auth";

const router = Router();

// Middleware to check if user has paid plan
const paidPlanMiddleware = async (req: any, res: any, next: any) => {
  try {
    const user = await storage.getUser(req.userId!);
    if (!user) {
      return res.status(403).json({ error: "Team collaboration is exclusively available for the Enterprise plan" });
    }

    // Allow admins regardless of plan
    if (user.isAdmin) {
      return next();
    }

    const plan = (user.plan || "").toString().toLowerCase().trim();
    if (plan !== "enterprise") {
      return res.status(403).json({ error: "Team collaboration is exclusively available for the Enterprise plan" });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Failed to verify subscription" });
  }
};

router.get("/members", authMiddleware, paidPlanMiddleware, async (req, res) => {
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

router.get("/verify-invite", async (req, res) => {
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

router.post("/accept-invite", authMiddleware, async (req, res) => {
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

router.post("/register-invite", async (req, res) => {
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

router.post("/invite", authMiddleware, paidPlanMiddleware, async (req, res) => {
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

router.patch("/members/:id", authMiddleware, paidPlanMiddleware, async (req, res) => {
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

router.delete("/members/:id", authMiddleware, paidPlanMiddleware, async (req, res) => {
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

export default router;
