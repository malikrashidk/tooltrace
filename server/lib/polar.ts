import { Polar } from '@polar-sh/sdk';

/**
 * Polar.sh SDK Client for Server-Side Operations
 * 
 * Initialize with your access token from Polar dashboard
 * Production: https://api.polar.sh/v1
 * Sandbox: https://sandbox-api.polar.sh/v1
 */

const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;
const POLAR_ENV = process.env.POLAR_ENV || 'production'; // 'production' or 'sandbox'

// Initialize Polar client
export const polarClient = POLAR_ACCESS_TOKEN
    ? new Polar({
        accessToken: POLAR_ACCESS_TOKEN,
        // Fix: Use literal strings "sandbox" or "production" to satisfy SDK types
        server: POLAR_ENV === 'sandbox' ? 'sandbox' : 'production'
    })
    : null;

export const POLAR_WEBHOOK_SECRET_KEY = POLAR_WEBHOOK_SECRET;

// Helper to verify Polar webhook signatures
export async function verifyPolarWebhook(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>
): Promise<boolean> {
    if (!POLAR_WEBHOOK_SECRET) {
        console.error('[Polar] Webhook secret not configured');
        return false;
    }

    try {
        const signatureHeader = headers['webhook-signature'] as string;
        if (!signatureHeader) {
            console.error('[Polar] No webhook signature found in headers');
            return false;
        }

        // Standard Webhooks format: v1,base64_signature (multiple can be comma separated)
        const parts = signatureHeader.split(' '); // Split multiple signatures if present
        let signaturePart: string = '';

        for (const part of parts) {
            const [version, sig] = part.split(',');
            if (version === 'v1') {
                signaturePart = sig;
                break;
            }
        }

        // Get ID and Timestamp from their specific headers
        const webhookId = headers['webhook-id'] as string || '';
        const timestamp = headers['webhook-timestamp'] as string || '';

        if (!timestamp || !signaturePart) {
            console.error('[Polar] Missing required signature components:', {
                hasTimestamp: !!timestamp,
                hasSignature: !!signaturePart,
                webhookId
            });
            return false;
        }

        const crypto = await import('crypto');

        // Signed content is: msg_id.timestamp.payload 
        const signedContent = `${webhookId}.${timestamp}.${payload.toString()}`;

        // Standard Webhooks signature is HMAC-SHA256
        const hmac = crypto.createHmac('sha256', POLAR_WEBHOOK_SECRET);
        hmac.update(signedContent);
        const calculatedSignature = hmac.digest('base64');

        // Check if signature matches
        // Some systems might send hex instead of base64, let's handle that if needed
        const isValid = calculatedSignature === signaturePart ||
            hmac.digest('hex') === signaturePart;

        if (!isValid) {
            console.error('[Polar] Signature verification failed');
            console.log('[Polar Debug] Signatures did not match:', {
                received: signaturePart,
                calculatedBase64: calculatedSignature,
                webhookId,
                timestamp
            });
        }

        return isValid;
    } catch (_error) {
        console.error('[Polar] Webhook verification error:', _error);
        return false;
    }
}

// Helper to list subscriptions for a customer by email
export async function listSubscriptionsByEmail(email: string) {
    if (!polarClient) return [];
    try {
        let customerId: string | null = null;
        console.log(`[Polar] Searching for customer with email: ${email}`);

        // 1. Find customer by email (using iterator)
        const customersResponse = await polarClient.customers.list({ email });
        for await (const page of customersResponse) {
            // SDK v0.42+ uses result.items or just items depending on version
            const items = (page as any).items || (page as any).result?.items || [];
            const customer = items.find((c: any) => c.email.toLowerCase() === email.toLowerCase());
            if (customer) {
                customerId = customer.id;
                console.log(`[Polar] Found customer ID: ${customerId}`);
                break;
            }
        }

        if (!customerId) {
            console.log(`[Polar] No customer found for email: ${email}`);
            return [];
        }

        // 2. Find active subscriptions for this customer (using iterator)
        const subscriptions: any[] = [];
        const result = await polarClient.subscriptions.list({
            customerId,
            active: true
        });

        for await (const page of result) {
            const items = (page as any).items || (page as any).result?.items || [];
            if (items) {
                subscriptions.push(...items);
            }
        }

        console.log(`[Polar] Found ${subscriptions.length} active subscriptions for customer ${customerId}`);
        return subscriptions;
    } catch (_error) {
        console.error('[Polar] Error listing subscriptions by email:', _error);
        return [];
    }
}

// Helper to cancel a subscription
export async function cancelSubscription(subscriptionId: string) {
    if (!polarClient) return null;
    try {
        console.log(`[Polar] Cancelling subscription: ${subscriptionId}`);
        // In Polar SDK, we use revoke to cancel/revoke
        return await polarClient.subscriptions.revoke({
            id: subscriptionId
        });
    } catch (_error) {
        // Log but don't throw to prevent webhook failure
        console.error('[Polar] Error cancelling subscription:', _error);
        return null;
    }
}




// Helper to update a subscription (Upgrade/Downgrade)
export async function updateSubscription(subscriptionId: string, newProductId: string) {
    if (!polarClient) return null;
    try {
        console.log(`[Polar] Updating subscription ${subscriptionId} to product ${newProductId}`);
        const result = await polarClient.subscriptions.update({
            id: subscriptionId,
            subscriptionUpdate: {
                productId: newProductId,
                // 'invoice' triggers immediate charge for the difference (SaaS standard)
                // 'prorate' adds it to the next invoice
                prorationBehavior: 'invoice'
            }
        });

        console.log('[Polar] Update result:', JSON.stringify(result, null, 2));
        return result;
    } catch (_error) {
        console.error('[Polar] Error updating subscription:', _error);
        throw _error;
    }
}

// Helper to get customer portal URL
export function getPolarCustomerPortalUrl(): string {
    const POLAR_ORGANIZATION_SLUG = process.env.VITE_POLAR_ORGANIZATION_SLUG || process.env.POLAR_ORGANIZATION_SLUG;
    const baseUrl = POLAR_ENV === 'sandbox'
        ? 'https://sandbox.polar.sh'
        : 'https://polar.sh';

    if (!POLAR_ORGANIZATION_SLUG) {
        // Fallback to ID-based if slug is missing, but slug is preferred for Polar.sh
        const POLAR_ORGANIZATION_ID = process.env.VITE_POLAR_ORGANIZATION_ID || process.env.POLAR_ORGANIZATION_ID;
        if (!POLAR_ORGANIZATION_ID) return baseUrl;
        return `${baseUrl}/customer-portal/${POLAR_ORGANIZATION_ID}`;
    }

    // Correct SaaS Portal URL: https://polar.sh/org-slug/portal
    return `${baseUrl}/${POLAR_ORGANIZATION_SLUG}/portal`;
}

// Log initialization status
if (polarClient) {
    console.log(`[Polar] Client initialized successfully (${POLAR_ENV} mode)`);
} else {
    console.warn('[Polar] Client not initialized - POLAR_ACCESS_TOKEN missing');
}
