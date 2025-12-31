import { sql } from "../db";
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
import {
    mapUser,
    mapTool,
    mapSubscription,
    mapNote,
    mapApiKey,
    mapPayment,
    mapReceipt,
    mapAuditLog,
    mapOAuthConnection,
    mapInboxDiscoveryResult,
    mapInboxDiscoveryRun,
} from "./mappers";

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
        const result = await sql`SELECT * FROM tools WHERE id = ${id} LIMIT 1`;
        return mapTool(result[0]);
    }

    async getUserTools(userId: string): Promise<Tool[]> {
        const result = await sql`SELECT * FROM tools WHERE user_id = ${userId} ORDER BY created_at DESC`;
        return result.map((row: any) => mapTool(row)!);
    }

    async createTool(tool: InsertTool & { userId: string }): Promise<Tool> {
        const result = await sql`
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

        const result = await sql(query, values);
        return mapTool(result[0]);
    }

    async deleteTool(id: string): Promise<boolean> {
        const result = await sql`DELETE FROM tools WHERE id = ${id} RETURNING id`;
        return result.length > 0;
    }

    async getUserToolsCount(userId: string): Promise<number> {
        const result = await sql`SELECT COUNT(*) FROM tools WHERE user_id = ${userId}`;
        return parseInt(result[0].count);
    }

    // Subscription operations
    async getUserSubscription(userId: string): Promise<Subscription | undefined> {
        const result = await sql`SELECT * FROM subscriptions WHERE user_id = ${userId} LIMIT 1`;
        return mapSubscription(result[0]);
    }

    async createSubscription(sub: InsertSubscription): Promise<Subscription> {
        const result = await sql`
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

        const result = await sql(query, values);
        return mapSubscription(result[0]);
    }

    // Payment operations
    async createPayment(payment: InsertPayment): Promise<Payment> {
        const result = await sql`
      INSERT INTO payments (user_id, amount, currency, status, paddle_payment_id, plan_upgrade, description)
      VALUES (${payment.userId}, ${payment.amount}, ${payment.currency}, ${payment.status}, ${payment.paddlePaymentId}, ${payment.planUpgrade}, ${payment.description})
      RETURNING *
    `;
        return mapPayment(result[0])!;
    }

    async getPayment(id: string): Promise<Payment | undefined> {
        const result = await sql`SELECT * FROM payments WHERE id = ${id} LIMIT 1`;
        return mapPayment(result[0]);
    }

    async getUserPayments(userId: string): Promise<Payment[]> {
        const result = await sql`SELECT * FROM payments WHERE user_id = ${userId} ORDER BY created_at DESC`;
        return result.map((row: any) => mapPayment(row)!);
    }

    // Receipt operations
    async createReceipt(receipt: InsertReceipt): Promise<Receipt> {
        const result = await sql`
      INSERT INTO receipts (user_id, tool_id, file_name, file_url, upload_date, amount, receipt_date)
      VALUES (${receipt.userId}, ${receipt.toolId}, ${receipt.fileName}, ${receipt.fileUrl}, ${receipt.uploadDate || new Date()}, ${receipt.amount}, ${receipt.receiptDate})
      RETURNING *
    `;
        return mapReceipt(result[0])!;
    }

    async getUserReceipts(userId: string): Promise<Receipt[]> {
        const result = await sql`SELECT * FROM receipts WHERE user_id = ${userId} ORDER BY upload_date DESC`;
        return result.map((row: any) => mapReceipt(row)!);
    }

    async deleteReceipt(id: string): Promise<boolean> {
        const result = await sql`DELETE FROM receipts WHERE id = ${id} RETURNING id`;
        return result.length > 0;
    }

    // API Key operations
    async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
        const result = await sql`
      INSERT INTO api_keys (user_id, name, key, secret, is_active)
      VALUES (${apiKey.userId}, ${apiKey.name}, ${apiKey.key}, ${apiKey.secret}, ${apiKey.isActive ?? true})
      RETURNING *
    `;
        return mapApiKey(result[0])!;
    }

    async getUserApiKeys(userId: string): Promise<ApiKey[]> {
        const result = await sql`SELECT * FROM api_keys WHERE user_id = ${userId} ORDER BY created_at DESC`;
        return result.map((row: any) => mapApiKey(row)!);
    }

    async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
        const result = await sql`SELECT * FROM api_keys WHERE key = ${key} AND is_active = true LIMIT 1`;
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
            values.push(value === undefined ? null : value);
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
      INSERT INTO audit_logs (user_id, action, resource, resource_id, changes, ip_address, user_agent)
      VALUES (${log.userId}, ${log.action}, ${log.resource}, ${log.resourceId}, ${log.changes}, ${log.ipAddress}, ${log.userAgent})
      RETURNING *
    `;
        return mapAuditLog(result[0])!;
    }

    async getAuditLogs(userId?: string, limit = 100): Promise<AuditLog[]> {
        let result;
        if (userId) {
            result = await sql`
        SELECT * FROM audit_logs 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
        } else {
            result = await sql`
        SELECT * FROM audit_logs 
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
        }
        return result.map((row: any) => mapAuditLog(row)!);
    }

    // Team Member operations
    async getTeamMembers(teamOwnerId: string): Promise<TeamMember[]> {
        const result = await sql`SELECT * FROM team_members WHERE team_owner_id = ${teamOwnerId} ORDER BY created_at DESC`;
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
        const result = await sql`SELECT * FROM team_members WHERE id = ${id} LIMIT 1`;
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
        const result = await sql`SELECT * FROM team_members WHERE invitation_token = ${token} LIMIT 1`;
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
        const result = await sql`
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

        const result = await sql(query, values);
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
        const result = await sql`DELETE FROM team_members WHERE id = ${id} RETURNING id`;
        return result.length > 0;
    }

    // Email verification helpers
    async setEmailVerificationToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
        await sql`
      UPDATE users
      SET email_verify_token_hash = ${tokenHash},
          email_verify_token_expires_at = ${expiresAt}
      WHERE id = ${userId}
    `;
    }

    async verifyEmailByTokenHash(tokenHash: string): Promise<User | null> {
        const result = await sql`
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

    // OAuth operations
    async getOAuthConnection(userId: string, provider: string): Promise<OAuthConnection | undefined> {
        const result = await sql`
      SELECT * FROM oauth_connections 
      WHERE user_id = ${userId} AND provider = ${provider}
      LIMIT 1
    `;
        return mapOAuthConnection(result[0]);
    }

    async createOAuthConnection(conn: InsertOAuthConnection): Promise<OAuthConnection> {
        const result = await sql`
      INSERT INTO oauth_connections (user_id, provider, access_token_enc, refresh_token_enc, scope, token_expiry)
      VALUES (${conn.userId}, ${conn.provider}, ${conn.accessTokenEnc}, ${conn.refreshTokenEnc}, ${conn.scope}, ${conn.tokenExpiry})
      RETURNING *
    `;
        return mapOAuthConnection(result[0])!;
    }

    async updateOAuthConnection(id: string, updates: Partial<OAuthConnection>): Promise<OAuthConnection | undefined> {
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

        const query = `UPDATE oauth_connections SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
        values.push(id);

        const result = await sql(query, values);
        return mapOAuthConnection(result[0]);
    }

    async deleteOAuthConnection(userId: string, provider: string): Promise<void> {
        await sql`DELETE FROM oauth_connections WHERE user_id = ${userId} AND provider = ${provider}`;
    }

    // Discovery operations
    async getDiscoveryResults(userId: string): Promise<InboxDiscoveryResult[]> {
        const result = await sql`SELECT * FROM inbox_discovery_results WHERE user_id = ${userId} ORDER BY confidence DESC`;
        return result.map((row: any) => mapInboxDiscoveryResult(row)!);
    }

    async createDiscoveryResult(result: InsertInboxDiscoveryResult): Promise<InboxDiscoveryResult> {
        const res = await sql`
      INSERT INTO inbox_discovery_results (user_id, provider, vendor_name, vendor_domain, evidence_sender, evidence_subject, confidence, last_seen_at)
      VALUES (${result.userId}, ${result.provider}, ${result.vendorName}, ${result.vendorDomain}, ${result.evidenceSender}, ${result.evidenceSubject}, ${result.confidence}, ${result.lastSeenAt})
      RETURNING *
    `;
        return mapInboxDiscoveryResult(res[0])!;
    }

    async clearDiscoveryResults(userId: string): Promise<void> {
        await sql`DELETE FROM inbox_discovery_results WHERE user_id = ${userId}`;
    }

    async createDiscoveryRun(run: InsertInboxDiscoveryRun): Promise<InboxDiscoveryRun> {
        const res = await sql`
      INSERT INTO inbox_discovery_runs (user_id, provider, status)
      VALUES (${run.userId}, ${run.provider}, ${run.status})
      RETURNING *
    `;
        return mapInboxDiscoveryRun(res[0])!;
    }

    async updateDiscoveryRun(id: string, updates: Partial<InboxDiscoveryRun>): Promise<InboxDiscoveryRun | undefined> {
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

        const query = `UPDATE inbox_discovery_runs SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        values.push(id);

        const res = await sql(query, values);
        return mapInboxDiscoveryRun(res[0]);
    }

    async getLatestDiscoveryRun(userId: string): Promise<InboxDiscoveryRun | undefined> {
        const res = await sql`
      SELECT * FROM inbox_discovery_runs 
      WHERE user_id = ${userId} 
      ORDER BY started_at DESC 
      LIMIT 1
    `;
        return mapInboxDiscoveryRun(res[0]);
    }

    async getDiscoveryRunsThisMonth(userId: string): Promise<number> {
        const res = await sql`
      SELECT COUNT(*) FROM inbox_discovery_runs 
      WHERE user_id = ${userId} 
      AND started_at > NOW() - INTERVAL '30 days'
    `;
        return parseInt(res[0].count);
    }
}
