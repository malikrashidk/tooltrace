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
    OAuthConnection,
    InsertOAuthConnection,
    InboxDiscoveryResult,
    InsertInboxDiscoveryResult,
    InboxDiscoveryRun,
    InsertInboxDiscoveryRun,
} from "../../shared/schema";
import { IStorage } from "./types";

export class MemStorage implements IStorage {
    private users: Map<string, User> = new Map();
    private tools: Map<string, Tool> = new Map();
    private subscriptions: Map<string, Subscription> = new Map();
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

    async createOAuthUser(userData: Partial<User>): Promise<User> {
        const id = randomUUID();
        const fullUser = {
            id,
            email: userData.email!,
            name: userData.name!,
            password: null,
            plan: "free",
            isAdmin: false,
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
            paddleCustomerId: null,
            paddleSubscriptionId: null
        } as User;
        this.users.set(id, fullUser as any);
        return fullUser;
    }

    async createUser(user: InsertUser): Promise<User> {
        const id = randomUUID();
        const fullUser = { ...user, id, isAdmin: false, plan: "free", createdAt: new Date(), updatedAt: new Date(), currency: (user as any).currency || "USD", language: (user as any).language || "en", budgetThreshold: null, lastLoginAt: new Date(), paddleCustomerId: null, paddleSubscriptionId: null } as any;
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
        // Also delete user's tools, subscriptions, payments, receipts, api keys, and notes
        const tools = Array.from(this.tools.values()).filter((t) => t.userId === id);
        for (const tool of tools) {
            this.tools.delete(tool.id);
        }

        const subscriptions = Array.from(this.subscriptions.values()).filter((s) => s.userId === id);
        for (const sub of subscriptions) {
            this.subscriptions.delete(sub.id);
        }

        const payments = Array.from(this.payments.values()).filter((p) => p.userId === id);
        for (const payment of payments) {
            this.payments.delete(payment.id);
        }

        const receipts = Array.from(this.receipts.values()).filter((r) => r.userId === id);
        for (const receipt of receipts) {
            this.receipts.delete(receipt.id);
        }

        const apiKeys = Array.from(this.apiKeys.values()).filter((k) => k.userId === id);
        for (const key of apiKeys) {
            this.apiKeys.delete(key.id);
        }

        const notes = Array.from(this.notes.values()).filter((n) => n.userId === id);
        for (const note of notes) {
            this.notes.delete(note.id);
        }

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
            totalUsageTime: "0"
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
                if (a.isPinned !== b.isPinned) {
                    return a.isPinned ? -1 : 1;
                }
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

    async getAuditLogs(userId?: string, limit = 100): Promise<AuditLog[]> {
        const list = userId ? this.auditLogs.filter((l) => l.userId === userId) : this.auditLogs.slice();
        return list
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
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
        return null;
    }

    async getOAuthConnection(userId: string, provider: string): Promise<OAuthConnection | undefined> {
        return undefined;
    }
    async createOAuthConnection(conn: InsertOAuthConnection): Promise<OAuthConnection> {
        const full = { ...conn, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() } as OAuthConnection;
        return full;
    }
    async updateOAuthConnection(id: string, updates: Partial<OAuthConnection>): Promise<OAuthConnection | undefined> {
        return undefined;
    }
    async deleteOAuthConnection(userId: string, provider: string): Promise<void> { }

    async getDiscoveryResults(userId: string): Promise<InboxDiscoveryResult[]> {
        return [];
    }
    async createDiscoveryResult(result: InsertInboxDiscoveryResult): Promise<InboxDiscoveryResult> {
        const full = { ...result, id: randomUUID(), createdAt: new Date() } as InboxDiscoveryResult;
        return full;
    }
    async clearDiscoveryResults(userId: string): Promise<void> { }
    async createDiscoveryRun(run: InsertInboxDiscoveryRun): Promise<InboxDiscoveryRun> {
        const full = { ...run, id: randomUUID(), startedAt: new Date(), finishedAt: null, itemsFoundCount: run.itemsFoundCount || 0 } as InboxDiscoveryRun;
        return full;
    }
    async updateDiscoveryRun(id: string, updates: Partial<InboxDiscoveryRun>): Promise<InboxDiscoveryRun | undefined> {
        return undefined;
    }
    async getLatestDiscoveryRun(userId: string): Promise<InboxDiscoveryRun | undefined> {
        return undefined;
    }
    async getDiscoveryRunsThisMonth(userId: string): Promise<number> {
        return 0;
    }
}
