import { sql } from "drizzle-orm";
import { pgTable, text, varchar, numeric, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
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
    plan: text("plan").notNull().default("free"), // free, standard, premium
    isAdmin: boolean("is_admin").notNull().default(false),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    // OAuth fields
    googleId: text("google_id").unique(),
    facebookId: text("facebook_id").unique(),
    oauthProvider: text("oauth_provider"), // google, facebook, or null for email/password
    avatarUrl: text("avatar_url"),
    // 2FA fields
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    twoFactorSecret: text("two_factor_secret"), // TOTP secret (encrypted)
    twoFactorBackupCodes: text("two_factor_backup_codes").array(), // Hashed backup codes
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
    planIdx: index("plan_idx").on(table.plan),
    googleIdIdx: index("google_id_idx").on(table.googleId),
    facebookIdIdx: index("facebook_id_idx").on(table.facebookId),
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
    credentials: jsonb("credentials"), // encrypted credentials
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    renewalIdx: index("renewal_date_idx").on(table.nextRenewalDate),
    paidIdx: index("is_paid_idx").on(table.isPaid),
  })
);

// ============ SUBSCRIPTIONS TABLE ============
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(), // free, standard, premium
    status: text("status").notNull().default("active"), // active, cancelled, past_due
    currentToolsCount: numeric("current_tools_count", { precision: 10, scale: 0 }).notNull().default("0"),
    toolsLimit: numeric("tools_limit", { precision: 10, scale: 0 }).notNull().default("5"),
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
    stripePaymentId: text("stripe_payment_id"),
    planUpgrade: text("plan_upgrade"), // free->standard, standard->premium
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
    fileUrl: text("file_url").notNull(),
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

// ============ INSERT SCHEMAS ============
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
});

export const insertToolSchema = createInsertSchema(tools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
