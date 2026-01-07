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

export interface IStorage {
    // User operations
    getUser(id: string): Promise<User | undefined>;
    getUserByEmail(email: string): Promise<User | undefined>;
    getUserByGoogleId(googleId: string): Promise<User | undefined>;
    getUserByFacebookId(facebookId: string): Promise<User | undefined>;
    getUserByResetToken(token: string): Promise<User | undefined>;
    getAllUsers(): Promise<User[]>;
    createUser(user: InsertUser): Promise<User>;
    createOAuthUser(userData: Partial<User>): Promise<User>;
    updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
    deleteUser(id: string): Promise<boolean>;

    // Tool operations
    getTool(id: string): Promise<Tool | undefined>;
    getUserTools(userId: string): Promise<Tool[]>;
    createTool(tool: InsertTool & { userId: string }): Promise<Tool>;
    updateTool(id: string, updates: Partial<Tool>): Promise<Tool | undefined>;
    deleteTool(id: string): Promise<boolean>;
    getUserToolsCount(userId: string): Promise<number>;

    // Subscription operations
    getUserSubscription(userId: string): Promise<Subscription | undefined>;
    createSubscription(sub: InsertSubscription): Promise<Subscription>;
    updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined>;

    // Payment operations
    createPayment(payment: InsertPayment): Promise<Payment>;
    getPayment(id: string): Promise<Payment | undefined>;
    getUserPayments(userId: string): Promise<Payment[]>;

    // Receipt operations
    createReceipt(receipt: InsertReceipt): Promise<Receipt>;
    getUserReceipts(userId: string): Promise<Receipt[]>;
    deleteReceipt(id: string): Promise<boolean>;

    // API Key operations
    createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
    getUserApiKeys(userId: string): Promise<ApiKey[]>;
    getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
    deleteApiKey(id: string): Promise<boolean>;

    // Note operations
    createNote(note: InsertNote & { userId: string }): Promise<Note>;
    getUserNotes(userId: string): Promise<Note[]>;
    getNote(id: string): Promise<Note | undefined>;
    updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined>;
    deleteNote(id: string): Promise<boolean>;

    // Audit Log operations
    createAuditLog(log: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog>;

    // Team Member operations
    getTeamMembers(teamOwnerId: string): Promise<TeamMember[]>;
    getTeamMember(id: string): Promise<TeamMember | undefined>;
    getTeamMemberByToken(token: string): Promise<TeamMember | undefined>;
    createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
    updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember | undefined>;
    deleteTeamMember(id: string): Promise<boolean>;

    // Detected Sites operations
    getDetectedSite(userId: string, domainKey: string): Promise<DetectedSite | undefined>;
    getDetectedSites(userId: string): Promise<DetectedSite[]>;
    createDetectedSite(site: InsertDetectedSite): Promise<DetectedSite>;
    updateDetectedSite(id: string, updates: Partial<DetectedSite>): Promise<DetectedSite | undefined>;

    // Detected Sites Daily operations
    getDetectedSiteDaily(siteId: string, date: string): Promise<DetectedSiteDaily | undefined>;
    upsertDetectedSiteDaily(siteId: string, date: string, count: number, time: number): Promise<void>;

    // Email verification
    setEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
    verifyEmailByTokenHash(tokenHash: string): Promise<User | null>;

    // Transactional operations
    registerUserWithSubscription(
        user: InsertUser,
        tokenHash: string,
        tokenExpiresAt: Date,
        subscription: Omit<InsertSubscription, "userId">
    ): Promise<User>;

    // OAuth Handoff
    storeHandoffCode(userId: string): Promise<string>;
    getHandoffCode(code: string): Promise<string | undefined>;

    // Background Jobs
    getExpiredSubscriptions(): Promise<Subscription[]>;
    getToolsByExpiration(days: number): Promise<{ tool: Tool; user: User }[]>;
    // Transactional Operations
    updateUserSubscription(userId: string, userUpdates: Partial<User>, subUpdates: Partial<Subscription>): Promise<void>;
    createToolWithAudit(userId: string, tool: InsertTool): Promise<Tool>;
    deleteToolWithAudit(userId: string, toolId: string): Promise<boolean>;
    suspendUser(userId: string, suspended: boolean): Promise<void>;
    getGlobalStats(): Promise<any>;
    getAuditLogs(limit?: number, offset?: number, userId?: string): Promise<AuditLog[]>;
}
