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
    } catch (error) {
        console.error('[Polar] Webhook verification error:', error);
        return false;
    }
}

// Log initialization status
if (polarClient) {
    console.log(`[Polar] Client initialized successfully (${POLAR_ENV} mode)`);
} else {
    console.warn('[Polar] Client not initialized - POLAR_ACCESS_TOKEN missing');
}
