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
} from "../../shared/schema";
import { users, subscriptions, tools, auditLogs } from "../../shared/schema";
import { IStorage } from "./types";
import { db, sql as neonSql } from "../db";
import { eq, and } from "drizzle-orm";
import {
    mapUser,
    mapTool,
    mapSubscription,
    mapNote,
    mapApiKey,
    mapPayment,
    mapReceipt,
    mapAuditLog,
    mapDetectedSite,
    mapDetectedSiteDaily,
} from "./mappers";

export class DbStorage implements IStorage {
    // User operations
    async getUser(id: string): Promise<User | undefined> {
        if (!id) return undefined;
        try {
            const result = await neonSql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
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
            const result = await neonSql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
            if (!result || !Array.isArray(result) || result.length === 0) return undefined;
            return mapUser(result[0]);
        } catch (error) {
            console.error("[DbStorage.getUserByEmail] Error:", email, error);
            return undefined;
        }
    }

    async getUserByGoogleId(googleId: string): Promise<User | undefined> {
        const result = await neonSql`SELECT * FROM users WHERE google_id = ${googleId} LIMIT 1`;
        return mapUser(result[0]);
    }

    async getUserByFacebookId(facebookId: string): Promise<User | undefined> {
        const result = await neonSql`SELECT * FROM users WHERE facebook_id = ${facebookId} LIMIT 1`;
        return mapUser(result[0]);
    }

    async getUserByPolarCustomerId(customerId: string): Promise<User | undefined> {
        const result = await neonSql`SELECT * FROM users WHERE polar_customer_id = ${customerId} LIMIT 1`;
        return mapUser(result[0]);
    }

    async getUserByResetToken(token: string): Promise<User | undefined> {
        try {
            const result = await neonSql`SELECT * FROM users WHERE reset_token = ${token} LIMIT 1`;
            if (!result || !Array.isArray(result) || result.length === 0) return undefined;
            return mapUser(result[0]);
        } catch (error) {
            console.error("[DbStorage.getUserByResetToken] Error:", error);
            return undefined;
        }
    }

    async getAllUsers(): Promise<User[]> {
        const result = await neonSql`SELECT * FROM users`;
        return result.map((row: any) => mapUser(row)!);
    }

    async createUser(user: InsertUser): Promise<User> {
        const result = await neonSql`
      INSERT INTO users (email, password, name)
      VALUES (${user.email}, ${user.password}, ${user.name})
      RETURNING *
    `;
        return mapUser(result[0])!;
    }

    async createOAuthUser(userData: Partial<User>): Promise<User> {
        const result = await neonSql`
      INSERT INTO users (email, name, password, google_id, facebook_id, oauth_provider, avatar_url, email_verified_at)
      VALUES (
        ${userData.email!},
        ${userData.name!},
        NULL,
        ${userData.googleId || null},
        ${userData.facebookId || null},
        ${userData.oauthProvider || null},
        ${userData.avatarUrl || null},
        NOW()
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
            values.push(value === undefined ? null : value);
            paramIndex++;
        });

        if (setClauses.length === 0) return undefined;

        try {
            const query = `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
            values.push(id);

            const result = await neonSql(query, values);
            return mapUser(result[0]);
        } catch (error) {
            console.error("[DbStorage.updateUser] Error:", error);
            throw error;
        }
    }

    async deleteUser(id: string): Promise<boolean> {
        const result = await neonSql`DELETE FROM users WHERE id = ${id} RETURNING id`;
        return result.length > 0;
    }

    // Tool operations
    async getTool(id: string): Promise<Tool | undefined> {
        const result = await neonSql`SELECT * FROM tools WHERE id = ${id} LIMIT 1`;
        return mapTool(result[0]);
    }

    async getUserTools(userId: string): Promise<Tool[]> {
        const result = await neonSql`SELECT * FROM tools WHERE user_id = ${userId} ORDER BY created_at DESC`;
        return result.map((row: any) => mapTool(row)!);
    }

    async createTool(tool: InsertTool & { userId: string }): Promise<Tool> {
        const result = await neonSql`
      INSERT INTO tools (user_id, name, website_url, logo_url, notes, is_paid, billing_amount, billing_cycle, next_renewal_date, categories, tags, usage_frequency, payment_method, credentials, secure_note, is_pinned)
      VALUES (${tool.userId}, ${tool.name}, ${tool.websiteUrl}, ${tool.logoUrl}, ${tool.notes}, ${tool.isPaid}, ${tool.billingAmount}, ${tool.billingCycle}, ${tool.nextRenewalDate}, ${tool.categories}, ${tool.tags}, ${tool.usageFrequency}, ${tool.paymentMethod}, ${tool.credentials}, ${tool.secureNote || null}, ${tool.isPinned || false})
      RETURNING *
    `;
        return mapTool(result[0])!;
    }

    async updateTool(id: string, updates: Partial<Tool>): Promise<Tool | undefined> {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            setClauses.push(`${snakeKey} = $${paramIndex}`);
            values.push(value === undefined ? null : value);
            paramIndex++;
        });

        if (setClauses.length === 0) return undefined;

        const query = `UPDATE tools SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
        values.push(id);

        const result = await neonSql(query, values);
        return mapTool(result[0]);
    }

    async deleteTool(id: string): Promise<boolean> {
        const result = await neonSql`DELETE FROM tools WHERE id = ${id} RETURNING id`;
        return result.length > 0;
    }

    async getUserToolsCount(userId: string): Promise<number> {
        const result = await neonSql`SELECT COUNT(*) FROM tools WHERE user_id = ${userId}`;
        return parseInt(result[0].count);
    }

    // Subscription operations
    async getUserSubscription(userId: string): Promise<Subscription | undefined> {
        const result = await neonSql`SELECT * FROM subscriptions WHERE user_id = ${userId} LIMIT 1`;
        return mapSubscription(result[0]);
    }

    async createSubscription(sub: InsertSubscription): Promise<Subscription> {
        const result = await neonSql`
      INSERT INTO subscriptions (user_id, plan, status, current_tools_count, tools_limit, start_date, renewal_date)
      VALUES (${sub.userId}, ${sub.plan}, ${sub.status || 'active'}, ${sub.currentToolsCount || 0}, ${sub.toolsLimit}, ${sub.startDate || new Date()}, ${sub.renewalDate})
      RETURNING *
    `;
        return mapSubscription(result[0])!;
    }

    async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            setClauses.push(`${snakeKey} = $${paramIndex}`);
            values.push(value === undefined ? null : value);
            paramIndex++;
        });

        if (setClauses.length === 0) return undefined;

        const query = `UPDATE subscriptions SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
        values.push(id);

        const result = await neonSql(query, values);
        return mapSubscription(result[0]);
    }

    // Payment operations
    async createPayment(payment: InsertPayment): Promise<Payment> {
        const result = await neonSql`
      INSERT INTO payments (user_id, amount, currency, status, polar_order_id, plan_upgrade, description)
      VALUES (${payment.userId}, ${payment.amount}, ${payment.currency}, ${payment.status}, ${payment.polarOrderId}, ${payment.planUpgrade}, ${payment.description})
      RETURNING *
    `;
        return mapPayment(result[0])!;
    }

    async getPayment(id: string): Promise<Payment | undefined> {
        const result = await neonSql`SELECT * FROM payments WHERE id = ${id} LIMIT 1`;
        return mapPayment(result[0]);
    }

    async getUserPayments(userId: string): Promise<Payment[]> {
        const result = await neonSql`SELECT * FROM payments WHERE user_id = ${userId} ORDER BY created_at DESC`;
        return result.map((row: any) => mapPayment(row)!);
    }

    // Receipt operations
    async createReceipt(receipt: InsertReceipt): Promise<Receipt> {
        const result = await neonSql`
      INSERT INTO receipts (user_id, tool_id, file_name, file_url, upload_date, amount, receipt_date)
      VALUES (${receipt.userId}, ${receipt.toolId}, ${receipt.fileName}, ${receipt.fileUrl}, ${receipt.uploadDate || new Date()}, ${receipt.amount}, ${receipt.receiptDate})
      RETURNING *
    `;
        return mapReceipt(result[0])!;
    }

    async getUserReceipts(userId: string): Promise<Receipt[]> {
        const result = await neonSql`SELECT * FROM receipts WHERE user_id = ${userId} ORDER BY upload_date DESC`;
        return result.map((row: any) => mapReceipt(row)!);
    }

    async deleteReceipt(id: string): Promise<boolean> {
        const result = await neonSql`DELETE FROM receipts WHERE id = ${id} RETURNING id`;
        return result.length > 0;
    }

    // API Key operations
    async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
        const result = await neonSql`
      INSERT INTO api_keys (user_id, name, key, secret, is_active)
      VALUES (${apiKey.userId}, ${apiKey.name}, ${apiKey.key}, ${apiKey.secret}, ${apiKey.isActive ?? true})
      RETURNING *
    `;
        return mapApiKey(result[0])!;
    }

    async getUserApiKeys(userId: string): Promise<ApiKey[]> {
        const result = await neonSql`SELECT * FROM api_keys WHERE user_id = ${userId} ORDER BY created_at DESC`;
        return result.map((row: any) => mapApiKey(row)!);
    }

    async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
        const result = await neonSql`SELECT * FROM api_keys WHERE key = ${key} AND is_active = true LIMIT 1`;
        return mapApiKey(result[0]);
    }

    async deleteApiKey(id: string): Promise<boolean> {
        const result = await neonSql`DELETE FROM api_keys WHERE id = ${id} RETURNING id`;
        return result.length > 0;
    }

    // Note operations
    async createNote(note: InsertNote & { userId: string }): Promise<Note> {
        const result = await neonSql`
      INSERT INTO notes (user_id, title, content, is_pinned)
      VALUES (${note.userId}, ${note.title}, ${note.content}, ${note.isPinned || false})
      RETURNING *
    `;
        return mapNote(result[0])!;
    }

    async getUserNotes(userId: string): Promise<Note[]> {
        const result = await neonSql`
      SELECT * FROM notes 
      WHERE user_id = ${userId} 
      ORDER BY is_pinned DESC, updated_at DESC
    `;
        return result.map((row: any) => mapNote(row)!);
    }

    async getNote(id: string): Promise<Note | undefined> {
        const result = await neonSql`SELECT * FROM notes WHERE id = ${id} LIMIT 1`;
        return mapNote(result[0]);
    }

    async updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined> {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            setClauses.push(`${snakeKey} = $${paramIndex}`);
            values.push(value === undefined ? null : value);
            paramIndex++;
        });

        if (setClauses.length === 0) return undefined;

        const query = `UPDATE notes SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
        values.push(id);

        const result = await neonSql(query, values);
        return mapNote(result[0]);
    }

    async deleteNote(id: string): Promise<boolean> {
        const result = await neonSql`DELETE FROM notes WHERE id = ${id} RETURNING id`;
        return result.length > 0;
    }

    // Audit Log operations
    async createAuditLog(log: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog> {
        const result = await neonSql`
      INSERT INTO audit_logs (user_id, action, resource, resource_id, changes, ip_address, user_agent)
      VALUES (${log.userId}, ${log.action}, ${log.resource}, ${log.resourceId}, ${log.changes}, ${log.ipAddress}, ${log.userAgent})
      RETURNING *
    `;
        return mapAuditLog(result[0])!;
    }

    async getAuditLogs(limit = 100, offset = 0, userId?: string): Promise<AuditLog[]> {
        let result;
        if (userId) {
            result = await neonSql`
        SELECT * FROM audit_logs 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC 
        LIMIT ${limit}
        OFFSET ${offset}
      `;
        } else {
            result = await neonSql`
        SELECT * FROM audit_logs 
        ORDER BY created_at DESC 
        LIMIT ${limit}
        OFFSET ${offset}
      `;
        }
        return result.map((row: any) => mapAuditLog(row)!);
    }

    // Team Member operations
    async getTeamMembers(teamOwnerId: string): Promise<TeamMember[]> {
        const result = await neonSql`SELECT * FROM team_members WHERE team_owner_id = ${teamOwnerId} ORDER BY created_at DESC`;
        return result.map((row: any) => ({
            id: row.id,
            teamOwnerId: row.team_owner_id,
            userId: row.user_id,
            email: row.email,
            role: row.role,
            status: row.status,
            invitedBy: row.invited_by,
            invitationToken: row.invitation_token,
            invitationExpiresAt: row.invitation_expires_at,
            joinedAt: row.joined_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
    }

    async getTeamMember(id: string): Promise<TeamMember | undefined> {
        const result = await neonSql`SELECT * FROM team_members WHERE id = ${id} LIMIT 1`;
        if (!result[0]) return undefined;
        const row = result[0];
        return {
            id: row.id,
            teamOwnerId: row.team_owner_id,
            userId: row.user_id,
            email: row.email,
            role: row.role,
            status: row.status,
            invitedBy: row.invited_by,
            invitationToken: row.invitation_token,
            invitationExpiresAt: row.invitation_expires_at,
            joinedAt: row.joined_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async getTeamMemberByToken(token: string): Promise<TeamMember | undefined> {
        const result = await neonSql`SELECT * FROM team_members WHERE invitation_token = ${token} LIMIT 1`;
        if (!result[0]) return undefined;
        const row = result[0];
        return {
            id: row.id,
            teamOwnerId: row.team_owner_id,
            userId: row.user_id,
            email: row.email,
            role: row.role,
            status: row.status,
            invitedBy: row.invited_by,
            invitationToken: row.invitation_token,
            invitationExpiresAt: row.invitation_expires_at,
            joinedAt: row.joined_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
        const result = await neonSql`
      INSERT INTO team_members (team_owner_id, user_id, email, role, status, invited_by, invitation_token, invitation_expires_at)
      VALUES (${member.teamOwnerId}, ${member.userId || null}, ${member.email}, ${member.role || 'member'}, ${member.status || 'pending'}, ${member.invitedBy}, ${member.invitationToken || null}, ${member.invitationExpiresAt || null})
      RETURNING *
    `;
        const row = result[0];
        return {
            id: row.id,
            teamOwnerId: row.team_owner_id,
            userId: row.user_id,
            email: row.email,
            role: row.role,
            status: row.status,
            invitedBy: row.invited_by,
            invitationToken: row.invitation_token,
            invitationExpiresAt: row.invitation_expires_at,
            joinedAt: row.joined_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember | undefined> {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            setClauses.push(`${snakeKey} = $${paramIndex}`);
            values.push(value === undefined ? null : value);
            paramIndex++;
        });

        if (setClauses.length === 0) return undefined;

        const query = `UPDATE team_members SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
        values.push(id);

        const result = await neonSql(query, values);
        const row = result[0];
        return {
            id: row.id,
            teamOwnerId: row.team_owner_id,
            userId: row.user_id,
            email: row.email,
            role: row.role,
            status: row.status,
            invitedBy: row.invited_by,
            invitationToken: row.invitation_token,
            invitationExpiresAt: row.invitation_expires_at,
            joinedAt: row.joined_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async deleteTeamMember(id: string): Promise<boolean> {
        const result = await neonSql`DELETE FROM team_members WHERE id = ${id} RETURNING id`;
        return result.length > 0;
    }

    // Email verification helpers
    async setEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
        await neonSql`
      UPDATE users
      SET email_verify_token_hash = ${tokenHash},
          email_verify_token_expires_at = ${expiresAt}
      WHERE id = ${userId}
    `;
    }

    async verifyEmailByTokenHash(tokenHash: string): Promise<User | null> {
        const result = await neonSql`
      UPDATE users
      SET email_verified_at = NOW(),
          email_verify_token_hash = NULL,
          email_verify_token_expires_at = NULL
      WHERE email_verify_token_hash = ${tokenHash}
      AND email_verify_token_expires_at > NOW()
      RETURNING *
    `;

        if (result.length === 0) return null;
        return mapUser(result[0])!;
    }

    // Detected Sites operations
    async getDetectedSite(userId: string, domainKey: string): Promise<DetectedSite | undefined> {
        const result = await neonSql`
            SELECT * FROM detected_sites
            WHERE user_id = ${userId} AND domain_key = ${domainKey}
            LIMIT 1
        `;
        return mapDetectedSite(result[0]);
    }

    async getDetectedSites(userId: string): Promise<DetectedSite[]> {
        const result = await neonSql`
            SELECT * FROM detected_sites
            WHERE user_id = ${userId}
            ORDER BY last_seen_at DESC
        `;
        return result.map((row: any) => mapDetectedSite(row)!);
    }

    async createDetectedSite(site: InsertDetectedSite): Promise<DetectedSite> {
        const result = await neonSql`
            INSERT INTO detected_sites (
                user_id, domain_key, display_name, favicon_url,
                first_seen_at, last_seen_at, visit_count_7d, visit_count_30d, visit_count_90d,
                confidence_level, status, tool_id, is_paid, billing_amount, currency, billing_cycle
            )
            VALUES (
                ${site.userId}, ${site.domainKey}, ${site.displayName || null}, ${site.faviconUrl || null},
                ${site.firstSeenAt || new Date()}, ${site.lastSeenAt || new Date()},
                ${site.visitCount7d || 0}, ${site.visitCount30d || 0}, ${site.visitCount90d || 0},
                ${site.confidenceLevel || 'visited'}, ${site.status || 'new'}, ${site.toolId || null},
                ${site.isPaid || false}, ${site.billingAmount || null}, ${site.currency || 'USD'}, ${site.billingCycle || null}
            )
            RETURNING *
        `;
        return mapDetectedSite(result[0])!;
    }

    async updateDetectedSite(id: string, updates: Partial<DetectedSite>): Promise<DetectedSite | undefined> {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            setClauses.push(`${snakeKey} = $${paramIndex}`);
            values.push(value === undefined ? null : value);
            paramIndex++;
        });

        if (setClauses.length === 0) return undefined;

        const query = `UPDATE detected_sites SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
        values.push(id);

        const result = await neonSql(query, values);
        return mapDetectedSite(result[0]);
    }

    // Detected Sites Daily operations
    async getDetectedSiteDaily(siteId: string, date: string): Promise<DetectedSiteDaily | undefined> {
        const result = await neonSql`
            SELECT * FROM detected_sites_daily
            WHERE detected_site_id = ${siteId} AND date = ${date}
            LIMIT 1
        `;
        return mapDetectedSiteDaily(result[0]);
    }

    async upsertDetectedSiteDaily(siteId: string, date: string, count: number, time: number): Promise<void> {
        await neonSql`
            INSERT INTO detected_sites_daily (detected_site_id, date, visit_count, usage_time)
            VALUES (${siteId}, ${date}, ${count}, ${time})
            ON CONFLICT (detected_site_id, date)
            DO UPDATE SET
                visit_count = detected_sites_daily.visit_count + ${count},
                usage_time = detected_sites_daily.usage_time + ${time}
        `;
    }

    async registerUserWithSubscription(
        user: InsertUser,
        tokenHash: string,
        tokenExpiresAt: Date,
        subscription: Omit<InsertSubscription, "userId">
    ): Promise<User> {
        return await db.transaction(async (tx: any) => {
            const [newUser] = await tx.insert(users).values({
                email: user.email,
                password: user.password,
                name: user.name,
                emailVerifyTokenHash: tokenHash,
                emailVerifyTokenExpiresAt: tokenExpiresAt,
            }).returning();

            await tx.insert(subscriptions).values({
                userId: newUser.id,
                plan: subscription.plan,
                status: subscription.status || 'active',
                currentToolsCount: subscription.currentToolsCount || 0,
                toolsLimit: subscription.toolsLimit,
                startDate: subscription.startDate || new Date(),
                renewalDate: subscription.renewalDate,
            });

            return newUser;
        });
    }

    private handoffCodes = new Map<string, { userId: string; expiresAt: number }>();

    async storeHandoffCode(userId: string): Promise<string> {
        const code = crypto.randomUUID();
        this.handoffCodes.set(code, {
            userId,
            expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
        });
        return code;
    }

    async getHandoffCode(code: string): Promise<string | undefined> {
        const data = this.handoffCodes.get(code);
        if (!data) return undefined;
        this.handoffCodes.delete(code); // One-time use
        if (data.expiresAt < Date.now()) return undefined;
        return data.userId;
    }

    async getExpiredSubscriptions(): Promise<Subscription[]> {
        const result = await neonSql`
            SELECT * FROM subscriptions 
            WHERE status = 'cancelled' 
            AND renewal_date < NOW()
        `;
        return result.map((row: any) => mapSubscription(row)!);
    }

    async getToolsByExpiration(days: number): Promise<{ tool: Tool; user: User }[]> {
        const result = await neonSql`
            SELECT t.*, u.id as user_id, u.email as user_email, u.name as user_name, u.plan as user_plan
            FROM tools t
            JOIN users u ON t.user_id = u.id
            WHERE t.is_paid = true
            AND t.next_renewal_date <= (NOW() + ${days} * INTERVAL '1 day')
            AND t.next_renewal_date > (NOW() + (${days} - 0.5) * INTERVAL '1 day')
            AND (
                (${days} = 3 AND t.notified3_days = false)
                OR (${days} = 0 AND t.notified_renewal_day = false)
            )
        `;
        return result.map((row: any) => ({
            tool: mapTool(row)!,
            user: mapUser({
                ...row,
                id: row.user_id,
                email: row.user_email,
                name: row.user_name,
                plan: row.user_plan
            })!
        }));
    }

    async updateUserSubscription(userId: string, userUpdates: Partial<User>, subUpdates: Partial<Subscription>): Promise<void> {
        await db.transaction(async (tx: any) => {
            // Update User
            if (Object.keys(userUpdates).length > 0) {
                await tx.update(users)
                    .set({ ...userUpdates, updatedAt: new Date() })
                    .where(eq(users.id, userId));
            }

            // Update Subscription
            const sub = await this.getUserSubscription(userId);
            if (sub && Object.keys(subUpdates).length > 0) {
                await tx.update(subscriptions)
                    .set({ ...subUpdates, updatedAt: new Date() })
                    .where(eq(subscriptions.id, sub.id));
            }
        });
    }

    async createToolWithAudit(userId: string, tool: InsertTool): Promise<Tool> {
        return await db.transaction(async (tx: any) => {
            const [newTool] = await tx.insert(tools).values({
                ...tool,
                userId,
                createdAt: new Date(),
                updatedAt: new Date(),
            }).returning();

            await tx.insert(auditLogs).values({
                userId,
                action: "create",
                resource: "tool",
                resourceId: newTool.id,
                createdAt: new Date()
            });

            return newTool;
        });
    }

    async deleteToolWithAudit(userId: string, toolId: string): Promise<boolean> {
        return await db.transaction(async (tx: any) => {
            const result = await tx.delete(tools)
                .where(and(eq(tools.id, toolId), eq(tools.userId, userId)))
                .returning();
            if (result.length === 0) return false;

            await tx.insert(auditLogs).values({
                userId,
                action: "delete",
                resource: "tool",
                resourceId: toolId,
                createdAt: new Date()
            });

            return true;
        });
    }
    async suspendUser(userId: string, suspended: boolean): Promise<void> {
        await this.updateUser(userId, { isSuspended: suspended });
    }

    async getGlobalStats(): Promise<any> {
        const users = await this.getAllUsers();
        const totalUsers = users.length;

        // Active users: Logged in within last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeUsersCount = users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) > thirtyDaysAgo).length;

        const totalRevenueResult = await neonSql`
            SELECT SUM(amount):: numeric as total 
            FROM payments 
            WHERE status = 'succeeded' OR status = 'completed'
            `;
        const totalRevenue = Number(totalRevenueResult[0]?.total || 0) / 100; // to dollars

        const activeProUsers = users.filter(u => u.plan === 'pro').length;
        const activeEnterpriseUsers = users.filter(u => u.plan === 'enterprise').length;
        const mrr = (activeProUsers * 9.99) + (activeEnterpriseUsers * 24.99);

        return {
            totalUsers,
            activeSubscriptions: activeUsersCount, // compatibility key
            totalRevenue,
            mrr
        };
    }

}
