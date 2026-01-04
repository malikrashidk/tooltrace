import type {
    User,
    Tool,
    Subscription,
    Payment,
    Receipt,
    ApiKey,
    Note,
    AuditLog,
    TeamMember,
    OAuthConnection,
    InboxDiscoveryResult,
    InboxDiscoveryRun,
} from "../../shared/schema";

// Helper to convert snake_case database rows to camelCase TypeScript objects
export function mapUser(row: any): User | undefined {
    if (!row) return undefined;
    return {
        id: row.id,
        email: row.email,
        password: row.password,
        name: row.name,
        plan: row.plan,
        isAdmin: row.is_admin,
        paddleCustomerId: row.paddle_customer_id,
        paddleSubscriptionId: row.paddle_subscription_id,
        googleId: row.google_id,
        facebookId: row.facebook_id,
        oauthProvider: row.oauth_provider,
        avatarUrl: row.avatar_url,
        twoFactorEnabled: row.two_factor_enabled,
        twoFactorSecret: row.two_factor_secret,
        twoFactorBackupCodes: row.two_factor_backup_codes,
        resetToken: row.reset_token,
        resetTokenExpiry: row.reset_token_expiry,
        emailVerifiedAt: row.email_verified_at,
        emailVerifyTokenHash: row.email_verify_token_hash,
        emailVerifyTokenExpiresAt: row.email_verify_token_expires_at,
        currency: row.currency,
        language: row.language,
        budgetThreshold: row.budget_threshold,
        lastLoginAt: row.last_login_at,
        isSuspended: row.is_suspended,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function mapTool(row: any): Tool | undefined {
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
        secureNote: row.secure_note ?? null,
        isPinned: row.is_pinned,
        lastUsedAt: row.last_used_at,
        totalUsageTime: row.total_usage_time,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function mapSubscription(row: any): Subscription | undefined {
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

export function mapNote(row: any): Note | undefined {
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

export function mapApiKey(row: any): ApiKey | undefined {
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

export function mapPayment(row: any): Payment | undefined {
    if (!row) return undefined;
    return {
        id: row.id,
        userId: row.user_id,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        paddlePaymentId: row.paddle_payment_id,
        planUpgrade: row.plan_upgrade,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function mapReceipt(row: any): Receipt | undefined {
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

export function mapAuditLog(row: any): AuditLog | undefined {
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

export function mapOAuthConnection(row: any): OAuthConnection | undefined {
    if (!row) return undefined;
    return {
        id: row.id,
        userId: row.user_id,
        provider: row.provider,
        accessTokenEnc: row.access_token_enc,
        refreshTokenEnc: row.refresh_token_enc,
        scope: row.scope,
        tokenExpiry: row.token_expiry,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function mapInboxDiscoveryResult(row: any): InboxDiscoveryResult | undefined {
    if (!row) return undefined;
    return {
        id: row.id,
        userId: row.user_id,
        provider: row.provider,
        vendorName: row.vendor_name,
        vendorDomain: row.vendor_domain,
        evidenceSender: row.evidence_sender,
        evidenceSubject: row.evidence_subject,
        confidence: row.confidence,
        lastSeenAt: row.last_seen_at,
        createdAt: row.created_at,
    };
}

export function mapInboxDiscoveryRun(row: any): InboxDiscoveryRun | undefined {
    if (!row) return undefined;
    return {
        id: row.id,
        userId: row.user_id,
        provider: row.provider,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        status: row.status,
        itemsFoundCount: row.items_found_count,
    };
}
