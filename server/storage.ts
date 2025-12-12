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
} from "@shared/schema";
import { tools } from "@shared/schema";
import { randomUUID } from "crypto";
import { sql, db } from "./db";

// Helper to convert snake_case database rows to camelCase TypeScript objects
function mapUser(row: any): User | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    name: row.name,
    plan: row.plan,
    isAdmin: row.is_admin,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    googleId: row.google_id,
    facebookId: row.facebook_id,
    oauthProvider: row.oauth_provider,
    avatarUrl: row.avatar_url,
    twoFactorEnabled: row.two_factor_enabled,
    twoFactorSecret: row.two_factor_secret,
    twoFactorBackupCodes: row.two_factor_backup_codes,
    resetToken: row.reset_token,
    resetTokenExpiry: row.reset_token_expiry,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTool(row: any): Tool | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    websiteUrl: row.website_url,
    logoUrl: row.logo_url,
    notes: row.notes,
    isPaid: row.is_paid,
    billingAmount: row.billing_amount,
    billingCycle: row.billing_cycle,
    nextRenewalDate: row.next_renewal_date,
    categories: row.categories,
    tags: row.tags,
    usageFrequency: row.usage_frequency,
    paymentMethod: row.payment_method,
    credentials: row.credentials,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubscription(row: any): Subscription | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
    currentToolsCount: row.current_tools_count,
    toolsLimit: row.tools_limit,
    startDate: row.start_date,
    renewalDate: row.renewal_date,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNote(row: any): Note | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    isPinned: row.is_pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapApiKey(row: any): ApiKey | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    key: row.key,
    secret: row.secret,
    lastUsedAt: row.last_used_at,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapPayment(row: any): Payment | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    stripePaymentId: row.stripe_payment_id,
    planUpgrade: row.plan_upgrade,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReceipt(row: any): Receipt | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    userId: row.user_id,
    toolId: row.tool_id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    uploadDate: row.upload_date,
    amount: row.amount,
    receiptDate: row.receipt_date,
    createdAt: row.created_at,
  };
}

function mapAuditLog(row: any): AuditLog | undefined {
  if (!row) return undefined;
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id,
    changes: row.changes,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private tools: Map<string, Tool> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private payments: Map<string, Payment> = new Map();
  private receipts: Map<string, Receipt> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();
  private notes: Map<string, Note> = new Map();
  private auditLogs: AuditLog[] = [];

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
    } as User;
    this.users.set(id, fullUser as any);
    return fullUser;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const fullUser = { ...user, id, isAdmin: false, plan: "free", createdAt: new Date(), updatedAt: new Date() } as any;
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

  async createTool(tool: InsertTool): Promise<Tool> {
    const id = randomUUID();
    const fullTool = { ...tool, id, createdAt: new Date(), updatedAt: new Date() } as Tool;
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

  async createNote(note: InsertNote): Promise<Note> {
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
}

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    if (!id) return undefined;
    try {
      const result = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
      if (!result || !Array.isArray(result) || result.length === 0) return undefined;
      return mapUser(result[0]);
    } catch (error: any) {
      console.error("[DbStorage.getUser] Error fetching user:", id, error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    try {
      const result = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
      if (!result || !Array.isArray(result) || result.length === 0) return undefined;
      return mapUser(result[0]);
    } catch (error) {
      console.error("[DbStorage.getUserByEmail] Error:", email, error);
      return undefined;
    }
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await sql`SELECT * FROM users WHERE google_id = ${googleId} LIMIT 1`;
    return mapUser(result[0]);
  }

  async getUserByFacebookId(facebookId: string): Promise<User | undefined> {
    const result = await sql`SELECT * FROM users WHERE facebook_id = ${facebookId} LIMIT 1`;
    return mapUser(result[0]);
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      const result = await sql`SELECT * FROM users WHERE reset_token = ${token} LIMIT 1`;
      if (!result || !Array.isArray(result) || result.length === 0) return undefined;
      return mapUser(result[0]);
    } catch (error) {
      console.error("[DbStorage.getUserByResetToken] Error:", error);
      return undefined;
    }
  }

  async getAllUsers(): Promise<User[]> {
    const result = await sql`SELECT * FROM users`;
    return result.map((row: any) => mapUser(row)!);
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await sql`
      INSERT INTO users (email, password, name)
      VALUES (${user.email}, ${user.password}, ${user.name})
      RETURNING *
    `;
    return mapUser(result[0])!;
  }

  async createOAuthUser(userData: Partial<User>): Promise<User> {
    const result = await sql`
      INSERT INTO users (email, name, password, google_id, facebook_id, oauth_provider, avatar_url)
      VALUES (
        ${userData.email!},
        ${userData.name!},
        NULL,
        ${userData.googleId || null},
        ${userData.facebookId || null},
        ${userData.oauthProvider || null},
        ${userData.avatarUrl || null}
      )
      RETURNING *
    `;
    return mapUser(result[0])!;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClauses.push(`${snakeKey} = $${paramIndex}`);
      // Explicitly handle null values for password reset token clearing
      // undefined should be skipped, but null should be passed to clear fields
      values.push(value === undefined ? null : value);
      paramIndex++;
    });

    if (setClauses.length === 0) return undefined;

    try {
      const query = `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
      values.push(id);

      const result = await sql(query, values);
      return mapUser(result[0]);
    } catch (error) {
      console.error("[DbStorage.updateUser] Error:", error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await sql`DELETE FROM users WHERE id = ${id} RETURNING id`;
    return result.length > 0;
  }

  // Tool operations
  async getTool(id: string): Promise<Tool | undefined> {
    try {
      const result = await sql`SELECT * FROM tools WHERE id = ${id} LIMIT 1`;
      if (!result || !Array.isArray(result) || result.length === 0) return undefined;
      return mapTool(result[0]);
    } catch (error) {
      console.error("[DbStorage.getTool] Error:", error);
      return undefined;
    }
  }

  async getUserTools(userId: string): Promise<Tool[]> {
    try {
      // Use raw query with explicit array handling to avoid Neon null pointer errors
      const result = await sql`SELECT * FROM tools WHERE user_id = ${userId} ORDER BY created_at DESC`;
      // Handle null/undefined results from Neon driver
      if (!result) return [];
      if (!Array.isArray(result)) return [];
      if (result.length === 0) return [];
      return result.map((row: any) => mapTool(row)).filter((t): t is Tool => t !== undefined);
    } catch (error) {
      // Neon serverless driver can throw on empty results - this is expected
      console.error("[DbStorage.getUserTools] Error (may be expected for empty results):", error);
      return [];
    }
  }

  async createTool(tool: InsertTool & { userId: string }): Promise<Tool> {
    try {
      // Use Drizzle ORM for proper type handling
      const insertData: any = {
        userId: tool.userId,
        name: tool.name,
        websiteUrl: tool.websiteUrl,
        isPaid: tool.isPaid,
        categories: tool.categories || [],
        tags: tool.tags || [],
        usageFrequency: tool.usageFrequency,
      };

      // Only add optional fields if they have actual values (not empty strings)
      if (tool.logoUrl && String(tool.logoUrl).trim()) {
        insertData.logoUrl = tool.logoUrl;
      }
      if (tool.notes && String(tool.notes).trim()) {
        insertData.notes = tool.notes;
      }
      if (tool.billingAmount && String(tool.billingAmount).trim()) {
        insertData.billingAmount = tool.billingAmount;
      }
      if (tool.billingCycle && String(tool.billingCycle).trim()) {
        insertData.billingCycle = tool.billingCycle;
      }
      if (tool.nextRenewalDate) {
        insertData.nextRenewalDate = tool.nextRenewalDate;
      }
      if (tool.paymentMethod && String(tool.paymentMethod).trim()) {
        insertData.paymentMethod = tool.paymentMethod;
      }
      if (tool.credentials) {
        insertData.credentials = tool.credentials;
      }

      console.log("[DbStorage.createTool] Insert data:", insertData);

      const result = await db.insert(tools).values(insertData).returning();
      
      console.log("[DbStorage.createTool] Raw result:", result);

      // Drizzle returns array, handle empty/null edge cases
      if (result && Array.isArray(result) && result.length > 0) {
        return result[0];
      }

      // If no result from RETURNING, fetch the most recently created tool for this user
      const createdTools = await sql`
        SELECT * FROM tools 
        WHERE name = ${tool.name} AND user_id = ${tool.userId}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      if (createdTools && createdTools.length > 0) {
        return mapTool(createdTools[0])!;
      }

      throw new Error("Failed to create tool - no result returned");
    } catch (error) {
      console.error("[DbStorage.createTool] Error:", error);
      throw error;
    }
  }

  async updateTool(id: string, updates: Partial<Tool>): Promise<Tool | undefined> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (key === 'credentials' && value !== null && value !== undefined) {
        setClauses.push(`${snakeKey} = $${paramIndex}::jsonb`);
        values.push(JSON.stringify(value));
      } else if ((key === 'categories' || key === 'tags') && value !== null && value !== undefined) {
        setClauses.push(`${snakeKey} = $${paramIndex}::text[]`);
        values.push(value);
      } else {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    });

    if (setClauses.length === 0) return undefined;

    const query = `UPDATE tools SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
    values.push(id);

    const result = await sql(query, values);
    return mapTool(result[0]);
  }

  async deleteTool(id: string): Promise<boolean> {
    const result = await sql`DELETE FROM tools WHERE id = ${id} RETURNING id`;
    return result.length > 0;
  }

  async getUserToolsCount(userId: string): Promise<number> {
    try {
      const result = await sql`SELECT COUNT(*) as count FROM tools WHERE user_id = ${userId}`;
      if (!result || !Array.isArray(result) || result.length === 0) return 0;
      return parseInt(result[0].count) || 0;
    } catch (error) {
      console.error("[DbStorage.getUserToolsCount] Error:", error);
      return 0;
    }
  }

  // Subscription operations
  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    try {
      const result = await sql`SELECT * FROM subscriptions WHERE user_id = ${userId} LIMIT 1`;
      if (!result || !Array.isArray(result) || result.length === 0) return undefined;
      return mapSubscription(result[0]);
    } catch (error) {
      console.error("[DbStorage.getUserSubscription] Error:", error);
      return undefined;
    }
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const result = await sql`
      INSERT INTO subscriptions (
        user_id, plan, status, current_tools_count, tools_limit, 
        start_date, renewal_date, cancelled_at
      )
      VALUES (
        ${sub.userId}, ${sub.plan}, ${sub.status || 'active'}, 
        ${sub.currentToolsCount || 0}, ${sub.toolsLimit || 8}, 
        ${sub.startDate || null}, ${sub.renewalDate || null}, ${sub.cancelledAt || null}
      )
      RETURNING *
    `;
    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error("Failed to create subscription");
    }
    return mapSubscription(result[0])!;
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClauses.push(`${snakeKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    if (setClauses.length === 0) return undefined;

    const query = `UPDATE subscriptions SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
    values.push(id);

    const result = await sql(query, values);
    return mapSubscription(result[0]);
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await sql`
      INSERT INTO payments (
        user_id, amount, currency, status, stripe_payment_id, 
        plan_upgrade, description
      )
      VALUES (
        ${payment.userId}, ${payment.amount}, ${payment.currency || 'USD'}, 
        ${payment.status || 'pending'}, ${payment.stripePaymentId || null}, 
        ${payment.planUpgrade || null}, ${payment.description || null}
      )
      RETURNING *
    `;
    return mapPayment(result[0])!;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const result = await sql`SELECT * FROM payments WHERE id = ${id} LIMIT 1`;
    return mapPayment(result[0]);
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    const result = await sql`SELECT * FROM payments WHERE user_id = ${userId}`;
    return result.map((row: any) => mapPayment(row)!);
  }

  // Receipt operations
  async createReceipt(receipt: InsertReceipt): Promise<Receipt> {
    const result = await sql`
      INSERT INTO receipts (
        user_id, tool_id, file_name, file_url, upload_date, amount, receipt_date
      )
      VALUES (
        ${receipt.userId}, ${receipt.toolId || null}, ${receipt.fileName}, 
        ${receipt.fileUrl}, ${receipt.uploadDate || null}, ${receipt.amount || null}, 
        ${receipt.receiptDate || null}
      )
      RETURNING *
    `;
    return mapReceipt(result[0])!;
  }

  async getUserReceipts(userId: string): Promise<Receipt[]> {
    const result = await sql`SELECT * FROM receipts WHERE user_id = ${userId}`;
    return result.map((row: any) => mapReceipt(row)!);
  }

  async deleteReceipt(id: string): Promise<boolean> {
    const result = await sql`DELETE FROM receipts WHERE id = ${id} RETURNING id`;
    return result.length > 0;
  }

  // API Key operations
  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const result = await sql`
      INSERT INTO api_keys (
        user_id, name, key, secret, last_used_at, is_active
      )
      VALUES (
        ${apiKey.userId}, ${apiKey.name}, ${apiKey.key}, ${apiKey.secret}, 
        ${apiKey.lastUsedAt || null}, ${apiKey.isActive ?? true}
      )
      RETURNING *
    `;
    return mapApiKey(result[0])!;
  }

  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    const result = await sql`SELECT * FROM api_keys WHERE user_id = ${userId}`;
    return result.map((row: any) => mapApiKey(row)!);
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const result = await sql`SELECT * FROM api_keys WHERE key = ${key} LIMIT 1`;
    return mapApiKey(result[0]);
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const result = await sql`DELETE FROM api_keys WHERE id = ${id} RETURNING id`;
    return result.length > 0;
  }

  // Note operations
  async createNote(note: InsertNote & { userId: string }): Promise<Note> {
    const result = await sql`
      INSERT INTO notes (user_id, title, content, is_pinned)
      VALUES (${note.userId}, ${note.title}, ${note.content}, ${note.isPinned || false})
      RETURNING *
    `;
    return mapNote(result[0])!;
  }

  async getUserNotes(userId: string): Promise<Note[]> {
    const result = await sql`
      SELECT * FROM notes 
      WHERE user_id = ${userId} 
      ORDER BY is_pinned DESC, updated_at DESC
    `;
    return result.map((row: any) => mapNote(row)!);
  }

  async getNote(id: string): Promise<Note | undefined> {
    const result = await sql`SELECT * FROM notes WHERE id = ${id} LIMIT 1`;
    return mapNote(result[0]);
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClauses.push(`${snakeKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    if (setClauses.length === 0) return undefined;

    const query = `UPDATE notes SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
    values.push(id);

    const result = await sql(query, values);
    return mapNote(result[0]);
  }

  async deleteNote(id: string): Promise<boolean> {
    const result = await sql`DELETE FROM notes WHERE id = ${id} RETURNING id`;
    return result.length > 0;
  }

  // Audit Log operations
  async createAuditLog(log: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog> {
    const result = await sql`
      INSERT INTO audit_logs (
        user_id, action, resource, resource_id, changes, ip_address, user_agent
      )
      VALUES (
        ${log.userId || null}, ${log.action}, ${log.resource}, ${log.resourceId || null}, 
        ${log.changes ? JSON.stringify(log.changes) : null}, 
        ${log.ipAddress || null}, ${log.userAgent || null}
      )
      RETURNING *
    `;
    return mapAuditLog(result[0])!;
  }
}

export const storage = new DbStorage();
