import { sql } from "drizzle-orm";
import { pgTable, text, varchar, numeric, timestamp, boolean, jsonb, index, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============ USERS TABLE ============
export const users = pgTable(
  "users",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: text("email").notNull().unique(),
    password: text("password"), // Nullable for OAuth-only users
    name: text("name").notNull(),
    plan: text("plan").notNull().default("free"), // free, pro, enterprise
    isAdmin: boolean("is_admin").notNull().default(false),
    polarCustomerId: text("polar_customer_id"),
    polarSubscriptionId: text("polar_subscription_id"),
    // OAuth fields
    googleId: text("google_id").unique(),
    facebookId: text("facebook_id").unique(),
    oauthProvider: text("oauth_provider"), // google, facebook, or null for email/password
    avatarUrl: text("avatar_url"),
    // 2FA fields
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    twoFactorSecret: text("two_factor_secret"), // TOTP secret (encrypted)
    twoFactorBackupCodes: text("two_factor_backup_codes").array(), // Hashed backup codes
    // Password reset fields
    resetToken: text("reset_token"),
    resetTokenExpiry: timestamp("reset_token_expiry"),
    // Email verification fields
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    emailVerifyTokenHash: text("email_verify_token_hash"),
    emailVerifyTokenExpiresAt: timestamp("email_verify_token_expires_at", {
      withTimezone: true,
    }),

    // User preferences
    currency: text("currency").default("USD"),
    language: text("language").default("en"),
    budgetThreshold: numeric("budget_threshold", { precision: 10, scale: 2 }),
    isSuspended: boolean("is_suspended").notNull().default(false),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
    planIdx: index("plan_idx").on(table.plan),
    googleIdIdx: index("google_id_idx").on(table.googleId),
    facebookIdIdx: index("facebook_id_idx").on(table.facebookId),
    polarCustomerIdIdx: index("polar_customer_id_idx").on(table.polarCustomerId),
  })
);

// ============ TOOLS TABLE ============
export const tools = pgTable(
  "tools",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    websiteUrl: text("website_url").notNull(),
    logoUrl: text("logo_url"),
    notes: text("notes"),
    isPaid: boolean("is_paid").notNull().default(false),
    billingAmount: numeric("billing_amount", { precision: 10, scale: 2 }),
    billingCycle: text("billing_cycle"), // monthly, yearly
    nextRenewalDate: timestamp("next_renewal_date"),
    categories: text("categories").array().notNull().default(sql`ARRAY[]::text[]`),
    tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
    usageFrequency: text("usage_frequency").notNull().default("weekly"), // daily, weekly, rarely
    paymentMethod: text("payment_method"),
    credentials: jsonb("credentials"), // encrypted credentials { ciphertext, iv, tag, salt }
    secureNote: text("secure_note"), // encrypted note
    isPinned: boolean("is_pinned").notNull().default(false),
    lastUsedAt: timestamp("last_used_at"),
    totalUsageTime: numeric("total_usage_time", { precision: 10, scale: 0 }).default("0"), // in minutes
    // Notification flags
    notified3Days: boolean("notified_3_days").notNull().default(false),
    notifiedRenewalDay: boolean("notified_renewal_day").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    renewalIdx: index("renewal_date_idx").on(table.nextRenewalDate),
    paidIdx: index("is_paid_idx").on(table.isPaid),
    pinnedIdx: index("pinned_idx").on(table.isPinned),
  })
);

// ============ SUBSCRIPTIONS TABLE ============
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(), // free, pro, enterprise
    status: text("status").notNull().default("active"), // active, cancelled, past_due
    currentToolsCount: numeric("current_tools_count", { precision: 10, scale: 0 }).notNull().default("0"),
    toolsLimit: numeric("tools_limit", { precision: 10, scale: 0 }).notNull().default("10"),
    startDate: timestamp("start_date").defaultNow().notNull(),
    renewalDate: timestamp("renewal_date"),
    cancelledAt: timestamp("cancelled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("subscription_user_id_idx").on(table.userId),
    statusIdx: index("subscription_status_idx").on(table.status),
  })
);

// ============ PAYMENTS TABLE ============
export const payments = pgTable(
  "payments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull().default("pending"), // pending, completed, failed
    polarOrderId: text("polar_order_id"),
    planUpgrade: text("plan_upgrade"), // free->pro, pro->enterprise
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("payment_user_id_idx").on(table.userId),
    statusIdx: index("payment_status_idx").on(table.status),
  })
);

// ============ RECEIPTS TABLE ============
export const receipts = pgTable(
  "receipts",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    toolId: varchar("tool_id").references(() => tools.id, { onDelete: "set null" }),
    fileName: text("file_name").notNull(),
    fileUrl: text("file_url").notNull(), // Now storing R2 URL or key instead of base64
    uploadDate: timestamp("upload_date").defaultNow().notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }),
    receiptDate: timestamp("receipt_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("receipt_user_id_idx").on(table.userId),
    toolIdIdx: index("receipt_tool_id_idx").on(table.toolId),
  })
);

// ============ AUDIT LOGS TABLE ============
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // create, update, delete, login, logout
    resource: text("resource").notNull(), // tool, subscription, payment
    resourceId: text("resource_id"),
    changes: jsonb("changes"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("audit_user_id_idx").on(table.userId),
    actionIdx: index("audit_action_idx").on(table.action),
    createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
  })
);

// ============ API KEYS TABLE ============
export const apiKeys = pgTable(
  "api_keys",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    key: text("key").notNull().unique(),
    secret: text("secret").notNull(),
    lastUsedAt: timestamp("last_used_at"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("apikey_user_id_idx").on(table.userId),
    keyIdx: index("apikey_key_idx").on(table.key),
  })
);

// ============ NOTES TABLE ============
export const notes = pgTable(
  "notes",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    isPinned: boolean("is_pinned").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("notes_user_id_idx").on(table.userId),
    pinnedIdx: index("notes_pinned_idx").on(table.isPinned),
  })
);

// ============ INSERT SCHEMAS ============
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
});

export const insertToolSchema = createInsertSchema(tools)
  .omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    nextRenewalDate: z.union([z.string(), z.date(), z.null()]).optional()
      .transform(val => {
        if (!val || val === null) return undefined;
        if (val instanceof Date) return val;
        if (typeof val === "string" && val.trim()) return new Date(val);
        return undefined;
      }),
    billingAmount: z.union([z.number(), z.string(), z.null()]).optional()
      .transform(val => {
        if (!val || val === null) return undefined;
        const str = String(val).trim();
        return str ? str : undefined;
      }),
    billingCycle: z.union([z.string(), z.null()]).optional()
      .transform(val => {
        if (val === null || val === undefined) return undefined;
        const str = String(val).trim();
        return str ? str : undefined;
      }),
    paymentMethod: z.union([z.string(), z.null()]).optional()
      .transform(val => {
        if (val === null || val === undefined) return undefined;
        const str = String(val).trim();
        return str ? str : undefined;
      }),
    notes: z.union([z.string(), z.null()]).optional()
      .transform(val => {
        if (val === null || val === undefined) return undefined;
        const str = String(val).trim();
        return str ? str : undefined;
      }),
  });

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
});

export const insertNoteSchema = createInsertSchema(notes)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    userId: true,
  })
  .extend({
    content: z.string()
      .min(1, "Note cannot be empty")
      .max(12000, "Note must be less than 1200 words (12,000 characters)")
      .refine(
        (text) => text.split(/\s+/).filter(Boolean).length <= 1200,
        "Note must be less than 1200 words"
      ),
  });

// ============ TYPE EXPORTS ============
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof tools.$inferSelect;

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

// ============ TEAM MEMBERS TABLE ============
export const teamMembers = pgTable(
  "team_members",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    teamOwnerId: varchar("team_owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // null for pending invitations
    email: text("email").notNull(),
    role: text("role").notNull().default("member"), // owner, admin, member, viewer
    status: text("status").notNull().default("pending"), // active, pending
    invitedBy: varchar("invited_by").references(() => users.id),
    invitationToken: text("invitation_token").unique(),
    invitationExpiresAt: timestamp("invitation_expires_at"),
    joinedAt: timestamp("joined_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    teamOwnerIdx: index("team_owner_idx").on(table.teamOwnerId),
    userIdIdx: index("team_user_id_idx").on(table.userId),
    emailIdx: index("team_email_idx").on(table.email),
    tokenIdx: index("team_token_idx").on(table.invitationToken),
  })
);

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============ DETECTED SITES TABLE ============
export const detectedSites = pgTable(
  "detected_sites",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    domainKey: text("domain_key").notNull(), // Normalized root domain
    displayName: text("display_name"),
    faviconUrl: text("favicon_url"),
    firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    visitCount7d: integer("visit_count_7d").default(0).notNull(),
    visitCount30d: integer("visit_count_30d").default(0).notNull(),
    visitCount90d: integer("visit_count_90d").default(0).notNull(),
    confidenceLevel: text("confidence_level").notNull().default("visited"), // visited, likely, confirmed
    status: text("status").notNull().default("new"), // new, added, ignored
    toolId: varchar("tool_id").references(() => tools.id, { onDelete: "set null" }),
    isPaid: boolean("is_paid").default(false),
    billingAmount: numeric("billing_amount", { precision: 10, scale: 2 }),
    currency: text("currency").default("USD"),
    billingCycle: text("billing_cycle"), // monthly, yearly
    // Payment signal fields
    visitedBillingPage: boolean("visited_billing_page").default(false).notNull(),
    billingPageUrl: text("billing_page_url"),
    usageIntensity: text("usage_intensity").default("low"), // low, medium, high
    subscriptionProbability: integer("subscription_probability").default(0).notNull(), // 0-100
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("detected_user_id_idx").on(table.userId),
    domainKeyIdx: index("detected_domain_key_idx").on(table.domainKey),
    statusIdx: index("detected_status_idx").on(table.status),
  })
);

// ============ DETECTED SITES DAILY TABLE ============
export const detectedSitesDaily = pgTable(
  "detected_sites_daily",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    detectedSiteId: varchar("detected_site_id").notNull().references(() => detectedSites.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    visitCount: integer("visit_count").default(0).notNull(),
    usageTime: integer("usage_time").default(0).notNull(),
  },
  (table) => ({
    siteDateIdx: uniqueIndex("detected_daily_site_date_idx").on(table.detectedSiteId, table.date),
  })
);

export type DetectedSite = typeof detectedSites.$inferSelect;
export type InsertDetectedSite = typeof detectedSites.$inferInsert;

export type DetectedSiteDaily = typeof detectedSitesDaily.$inferSelect;
export type InsertDetectedSiteDaily = typeof detectedSitesDaily.$inferInsert;
