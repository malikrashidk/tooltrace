import { randomUUID } from "crypto";
import type {
    User,
    InsertUser,
    Tool,
    InsertTool,
    Subscription,
    InsertSubscription,
    Payment,
    InsertPayment,
    Receipt,
    InsertReceipt,
    ApiKey,
    InsertApiKey,
    Note,
    InsertNote,
    AuditLog,
    TeamMember,
    InsertTeamMember,
    DetectedSite,
    InsertDetectedSite,
    DetectedSiteDaily,
    InsertDetectedSiteDaily,
} from "../../shared/schema";
import { IStorage } from "./types";

export class MemStorage implements IStorage {
    private users: Map<string, User> = new Map();
    private tools: Map<string, Tool> = new Map();
    private subscriptions = new Map<string, Subscription>();
    private handoffCodes = new Map<string, { userId: string; expiresAt: number }>();
    private payments: Map<string, Payment> = new Map();
    private receipts: Map<string, Receipt> = new Map();
    private apiKeys: Map<string, ApiKey> = new Map();
    private notes: Map<string, Note> = new Map();
    private auditLogs: AuditLog[] = [];
    private teamMembers: Map<string, TeamMember> = new Map();

    async getUser(id: string): Promise<User | undefined> {
        return this.users.get(id);
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        return Array.from(this.users.values()).find((u) => u.email === email);
    }

    async getUserByGoogleId(googleId: string): Promise<User | undefined> {
        return Array.from(this.users.values()).find((u) => u.googleId === googleId);
    }

    async getUserByFacebookId(facebookId: string): Promise<User | undefined> {
        return Array.from(this.users.values()).find((u) => u.facebookId === facebookId);
    }

    async getUserByResetToken(token: string): Promise<User | undefined> {
        return Array.from(this.users.values()).find((u) => u.resetToken === token);
    }

    async getUserByPolarCustomerId(customerId: string): Promise<User | undefined> {
        return Array.from(this.users.values()).find((u) => u.polarCustomerId === customerId);
    }

    async createOAuthUser(userData: Partial<User>): Promise<User> {
        const id = randomUUID();
        const fullUser = {
            id,
            email: userData.email!,
            name: userData.name!,
            password: null,
            plan: "free",
            isAdmin: false,
            isSuspended: false,
            googleId: userData.googleId || null,
            facebookId: userData.facebookId || null,
            oauthProvider: userData.oauthProvider || null,
            avatarUrl: userData.avatarUrl || null,
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorBackupCodes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            currency: userData.currency || "USD",
            language: userData.language || "en",
            budgetThreshold: null,
            lastLoginAt: new Date(),
            emailVerifiedAt: new Date(),
            polarCustomerId: null,
            polarSubscriptionId: null
        } as User;
        this.users.set(id, fullUser);
        return fullUser;
    }

    async createUser(user: InsertUser): Promise<User> {
        const id = randomUUID();
        const fullUser = {
            ...user,
            id,
            isAdmin: false,
            isSuspended: false,
            plan: "free",
            createdAt: new Date(),
            updatedAt: new Date(),
            currency: (user as any).currency || "USD",
            language: (user as any).language || "en",
            budgetThreshold: null,
            lastLoginAt: new Date(),
            polarCustomerId: null,
            polarSubscriptionId: null
        } as any;
        this.users.set(id, fullUser);
        return fullUser;
    }

    async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
        const user = this.users.get(id);
        if (!user) return undefined;
        const updated = { ...user, ...updates, updatedAt: new Date() };
        this.users.set(id, updated);
        return updated;
    }

    async getAllUsers(): Promise<User[]> {
        return Array.from(this.users.values());
    }

    async deleteUser(id: string): Promise<boolean> {
        const toolsToDelete = Array.from(this.tools.values()).filter((t) => t.userId === id);
        for (const tool of toolsToDelete) this.tools.delete(tool.id);

        const subsToDelete = Array.from(this.subscriptions.values()).filter((s) => s.userId === id);
        for (const sub of subsToDelete) this.subscriptions.delete(sub.id);

        const paymentsToDelete = Array.from(this.payments.values()).filter((p) => p.userId === id);
        for (const payment of paymentsToDelete) this.payments.delete(payment.id);

        const receiptsToDelete = Array.from(this.receipts.values()).filter((r) => r.userId === id);
        for (const receipt of receiptsToDelete) this.receipts.delete(receipt.id);

        const keysToDelete = Array.from(this.apiKeys.values()).filter((k) => k.userId === id);
        for (const key of keysToDelete) this.apiKeys.delete(key.id);

        const notesToDelete = Array.from(this.notes.values()).filter((n) => n.userId === id);
        for (const note of notesToDelete) this.notes.delete(note.id);

        return this.users.delete(id);
    }

    async getTool(id: string): Promise<Tool | undefined> {
        return this.tools.get(id);
    }

    async getUserTools(userId: string): Promise<Tool[]> {
        return Array.from(this.tools.values()).filter((t) => t.userId === userId);
    }

    async createTool(tool: InsertTool & { userId: string }): Promise<Tool> {
        const id = randomUUID();
        const fullTool = {
            ...tool,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
            secureNote: (tool as any).secureNote || null,
            isPinned: (tool as any).isPinned || false,
            lastUsedAt: null,
            totalUsageTime: "0",
            notified_3_days: false,
            notifiedRenewalDay: false
        } as Tool;
        this.tools.set(id, fullTool);
        return fullTool;
    }

    async updateTool(id: string, updates: Partial<Tool>): Promise<Tool | undefined> {
        const tool = this.tools.get(id);
        if (!tool) return undefined;
        const updated = { ...tool, ...updates, updatedAt: new Date() };
        this.tools.set(id, updated);
        return updated;
    }

    async deleteTool(id: string): Promise<boolean> {
        return this.tools.delete(id);
    }

    async getUserToolsCount(userId: string): Promise<number> {
        return Array.from(this.tools.values()).filter((t) => t.userId === userId).length;
    }

    async getUserSubscription(userId: string): Promise<Subscription | undefined> {
        return Array.from(this.subscriptions.values()).find((s) => s.userId === userId);
    }

    async createSubscription(sub: InsertSubscription): Promise<Subscription> {
        const id = randomUUID();
        const fullSub = { ...sub, id, createdAt: new Date(), updatedAt: new Date() } as Subscription;
        this.subscriptions.set(id, fullSub);
        return fullSub;
    }

    async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
        const sub = this.subscriptions.get(id);
        if (!sub) return undefined;
        const updated = { ...sub, ...updates, updatedAt: new Date() };
        this.subscriptions.set(id, updated);
        return updated;
    }

    async createPayment(payment: InsertPayment): Promise<Payment> {
        const id = randomUUID();
        const fullPayment = { ...payment, id, createdAt: new Date(), updatedAt: new Date() } as Payment;
        this.payments.set(id, fullPayment);
        return fullPayment;
    }

    async getPayment(id: string): Promise<Payment | undefined> {
        return this.payments.get(id);
    }

    async getUserPayments(userId: string): Promise<Payment[]> {
        return Array.from(this.payments.values()).filter((p) => p.userId === userId);
    }

    async createReceipt(receipt: InsertReceipt): Promise<Receipt> {
        const id = randomUUID();
        const fullReceipt = { ...receipt, id, createdAt: new Date() } as Receipt;
        this.receipts.set(id, fullReceipt);
        return fullReceipt;
    }

    async getUserReceipts(userId: string): Promise<Receipt[]> {
        return Array.from(this.receipts.values()).filter((r) => r.userId === userId);
    }

    async deleteReceipt(id: string): Promise<boolean> {
        return this.receipts.delete(id);
    }

    async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
        const id = randomUUID();
        const fullKey = { ...apiKey, id, createdAt: new Date() } as ApiKey;
        this.apiKeys.set(id, fullKey);
        return fullKey;
    }

    async getUserApiKeys(userId: string): Promise<ApiKey[]> {
        return Array.from(this.apiKeys.values()).filter((k) => k.userId === userId);
    }

    async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
        return Array.from(this.apiKeys.values()).find((k) => k.key === key);
    }

    async deleteApiKey(id: string): Promise<boolean> {
        return this.apiKeys.delete(id);
    }

    async createNote(note: InsertNote & { userId: string }): Promise<Note> {
        const id = randomUUID();
        const fullNote = { ...note, id, createdAt: new Date(), updatedAt: new Date() } as Note;
        this.notes.set(id, fullNote);
        return fullNote;
    }

    async getUserNotes(userId: string): Promise<Note[]> {
        return Array.from(this.notes.values())
            .filter((n) => n.userId === userId)
            .sort((a, b) => {
                if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
                return b.updatedAt.getTime() - a.updatedAt.getTime();
            });
    }

    async getNote(id: string): Promise<Note | undefined> {
        return this.notes.get(id);
    }

    async updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined> {
        const note = this.notes.get(id);
        if (!note) return undefined;
        const updated = { ...note, ...updates, updatedAt: new Date() };
        this.notes.set(id, updated);
        return updated;
    }

    async deleteNote(id: string): Promise<boolean> {
        return this.notes.delete(id);
    }

    async createAuditLog(log: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog> {
        const id = randomUUID();
        const fullLog = { ...log, id, createdAt: new Date() } as AuditLog;
        this.auditLogs.push(fullLog);
        return fullLog;
    }

    async getAuditLogs(limit = 100, offset = 0, userId?: string): Promise<AuditLog[]> {
        let logs = this.auditLogs;
        if (userId) logs = logs.filter(l => l.userId === userId);
        return logs
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(offset, offset + limit);
    }

    async getTeamMembers(teamOwnerId: string): Promise<TeamMember[]> {
        return Array.from(this.teamMembers.values()).filter((m) => m.teamOwnerId === teamOwnerId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async getTeamMember(id: string): Promise<TeamMember | undefined> {
        return this.teamMembers.get(id);
    }

    async getTeamMemberByToken(token: string): Promise<TeamMember | undefined> {
        return Array.from(this.teamMembers.values()).find((m) => m.invitationToken === token);
    }

    async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
        const id = randomUUID();
        const full: TeamMember = {
            id,
            teamOwnerId: (member as any).teamOwnerId,
            userId: (member as any).userId || null,
            email: (member as any).email,
            role: (member as any).role || 'member',
            status: (member as any).status || 'pending',
            invitedBy: (member as any).invitedBy || null,
            invitationToken: (member as any).invitationToken || null,
            invitationExpiresAt: (member as any).invitationExpiresAt || null,
            joinedAt: (member as any).joinedAt || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.teamMembers.set(id, full);
        return full;
    }

    async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember | undefined> {
        const existing = this.teamMembers.get(id);
        if (!existing) return undefined;
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        this.teamMembers.set(id, updated);
        return updated;
    }

    async deleteTeamMember(id: string): Promise<boolean> {
        return this.teamMembers.delete(id);
    }

    async setEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
        const user = this.users.get(userId);
        if (user) {
            const updated = { ...user, emailVerifyTokenHash: tokenHash, emailVerifyTokenExpiresAt: expiresAt };
            this.users.set(userId, updated);
        }
    }

    async verifyEmailByTokenHash(tokenHash: string): Promise<User | null> {
        return Array.from(this.users.values()).find(u => u.emailVerifyTokenHash === tokenHash) || null;
    }

    async registerUserWithSubscription(
        user: InsertUser,
        tokenHash: string,
        tokenExpiresAt: Date,
        subscription: Omit<InsertSubscription, "userId">
    ): Promise<User> {
        const userId = randomUUID();
        const fullUser: User = {
            id: userId,
            email: user.email,
            password: user.password || null,
            name: user.name,
            plan: subscription.plan as any,
            isAdmin: false,
            isSuspended: false,
            emailVerifyTokenHash: tokenHash,
            emailVerifyTokenExpiresAt: tokenExpiresAt,
            createdAt: new Date(),
            updatedAt: new Date(),
            currency: "USD",
            language: "en",
            budgetThreshold: null,
            lastLoginAt: new Date(),
            emailVerifiedAt: null,
            polarCustomerId: null,
            polarSubscriptionId: null,
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorBackupCodes: null,
            avatarUrl: null,
            facebookId: null,
            googleId: null,
            oauthProvider: null,
            resetToken: null,
            resetTokenExpiry: null,
        };
        this.users.set(userId, fullUser);

        const subId = randomUUID();
        const fullSub: Subscription = {
            id: subId,
            userId,
            plan: subscription.plan,
            status: subscription.status || 'active',
            currentToolsCount: String(subscription.currentToolsCount || 0),
            toolsLimit: String(subscription.toolsLimit || 10),
            startDate: subscription.startDate || new Date(),
            renewalDate: subscription.renewalDate || null,
            cancelledAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.subscriptions.set(subId, fullSub);
        return fullUser;
    }

    async getExpiredSubscriptions(): Promise<Subscription[]> {
        const now = new Date();
        return Array.from(this.subscriptions.values()).filter(sub =>
            sub.status === 'cancelled' && sub.renewalDate && new Date(sub.renewalDate) < now
        );
    }

    async getToolsByExpiration(days: number): Promise<{ tool: Tool; user: User }[]> {
        const now = new Date();
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        const thresholdDate = new Date(now.getTime() + (days - 1) * 24 * 60 * 60 * 1000);

        const results: { tool: Tool; user: User }[] = [];
        for (const tool of this.tools.values()) {
            if (tool.isPaid && tool.nextRenewalDate) {
                const renewal = new Date(tool.nextRenewalDate);
                if (renewal <= futureDate && renewal > thresholdDate) {
                    // Check if already notified for this period
                    if (days === 3 && tool.notified_3_days) continue;
                    if (days === 0 && tool.notifiedRenewalDay) continue;

                    const user = this.users.get(tool.userId);
                    if (user) results.push({ tool, user });
                }
            }
        }
        return results;
    }

    async updateUserSubscription(userId: string, userUpdates: Partial<User>, subUpdates: Partial<Subscription>): Promise<void> {
        const user = this.users.get(userId);
        if (user) this.users.set(userId, { ...user, ...userUpdates, updatedAt: new Date() });

        const sub = await this.getUserSubscription(userId);
        if (sub) this.subscriptions.set(sub.id, { ...sub, ...subUpdates, updatedAt: new Date() });
    }

    async createToolWithAudit(userId: string, tool: InsertTool): Promise<Tool> {
        const newTool = await this.createTool({ ...tool, userId });
        await this.createAuditLog({
            userId,
            action: "create",
            resource: "tool",
            resourceId: newTool.id,
            changes: null,
            ipAddress: null,
            userAgent: null
        });
        return newTool;
    }

    async deleteToolWithAudit(userId: string, toolId: string): Promise<boolean> {
        const tool = this.tools.get(toolId);
        if (!tool || tool.userId !== userId) return false;
        const deleted = await this.deleteTool(toolId);
        if (deleted) {
            await this.createAuditLog({
                userId,
                action: "delete",
                resource: "tool",
                resourceId: toolId,
                changes: null,
                ipAddress: null,
                userAgent: null
            });
        }
        return deleted;
    }

    async storeHandoffCode(userId: string): Promise<string> {
        const code = randomUUID();
        this.handoffCodes.set(code, { userId, expiresAt: Date.now() + 5 * 60 * 1000 });
        return code;
    }

    async getHandoffCode(code: string): Promise<string | undefined> {
        const entry = this.handoffCodes.get(code);
        if (!entry) return undefined;
        this.handoffCodes.delete(code);
        if (entry.expiresAt < Date.now()) return undefined;
        return entry.userId;
    }

    async suspendUser(userId: string, suspended: boolean): Promise<void> {
        const user = this.users.get(userId);
        if (user) this.users.set(userId, { ...user, isSuspended: suspended, updatedAt: new Date() });
    }

    async getGlobalStats(): Promise<any> {
        const users = Array.from(this.users.values());
        const totalUsers = users.length;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeUsersCount = users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) > thirtyDaysAgo).length;

        const totalRevenue = Array.from(this.payments.values())
            .filter(p => p.status === 'completed' || p.status === 'succeeded')
            .reduce((sum, p) => sum + Number(p.amount), 0) / 100;

        const activeProUsers = users.filter(u => u.plan === 'pro').length;
        const activeEnterpriseUsers = users.filter(u => u.plan === 'enterprise').length;
        const mrr = (activeProUsers * 9.99) + (activeEnterpriseUsers * 24.99);

        return {
            totalUsers,
            activeSubscriptions: activeUsersCount,
            totalRevenue,
            mrr
        };
    }

    // Detected Sites operations
    private detectedSites = new Map<string, DetectedSite>();
    private detectedSitesDaily = new Map<string, DetectedSiteDaily>();

    async getDetectedSite(userId: string, domainKey: string): Promise<DetectedSite | undefined> {
        return Array.from(this.detectedSites.values()).find(
            s => s.userId === userId && s.domainKey === domainKey
        );
    }

    async getDetectedSites(userId: string): Promise<DetectedSite[]> {
        return Array.from(this.detectedSites.values())
            .filter(s => s.userId === userId)
            .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
    }

    async createDetectedSite(site: InsertDetectedSite): Promise<DetectedSite> {
        const id = randomUUID();
        const fullSite = {
            ...site,
            id,
            displayName: site.displayName || null,
            faviconUrl: site.faviconUrl || null,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
            visitCount7d: 0,
            visitCount30d: 0,
            visitCount90d: 0,
            confidenceLevel: site.confidenceLevel || 'visited',
            status: site.status || 'new',
            toolId: site.toolId || null,
            isPaid: site.isPaid || false,
            billingAmount: site.billingAmount || null,
            currency: site.currency || "USD",
            billingCycle: site.billingCycle || null,
            createdAt: new Date(),
            updatedAt: new Date()
        } as DetectedSite;
        this.detectedSites.set(id, fullSite);
        return fullSite;
    }

    async updateDetectedSite(id: string, updates: Partial<DetectedSite>): Promise<DetectedSite | undefined> {
        const site = this.detectedSites.get(id);
        if (!site) return undefined;
        const updated = { ...site, ...updates, updatedAt: new Date() };
        this.detectedSites.set(id, updated);
        return updated;
    }

    // Detected Sites Daily operations
    async getDetectedSiteDaily(siteId: string, date: string): Promise<DetectedSiteDaily | undefined> {
        return Array.from(this.detectedSitesDaily.values()).find(
            d => d.detectedSiteId === siteId && d.date === date
        );
    }

    async upsertDetectedSiteDaily(siteId: string, date: string, count: number, time: number): Promise<void> {
        const existing = await this.getDetectedSiteDaily(siteId, date);
        if (existing) {
            const updated = {
                ...existing,
                visitCount: existing.visitCount + count,
                usageTime: existing.usageTime + time
            };
            this.detectedSitesDaily.set(existing.id, updated);
        } else {
            const id = randomUUID();
            this.detectedSitesDaily.set(id, {
                id,
                detectedSiteId: siteId,
                date,
                visitCount: count,
                usageTime: time
            });
        }
    }
}
