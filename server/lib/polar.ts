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
    payload: string,
    headers: Record<string, string | string[] | undefined>
): Promise<boolean> {
    if (!POLAR_WEBHOOK_SECRET) {
        console.error('[Polar] Webhook secret not configured');
        return false;
    }

    try {
        // Polar uses Standard Webhooks spec
        // The signature is in the 'webhook-signature' header
        const signature = headers['webhook-signature'] as string;

        if (!signature) {
            console.error('[Polar] No webhook signature found');
            return false;
        }

        // Use Polar SDK's built-in verification (if available)
        // For now, we'll implement manual verification using Standard Webhooks
        const crypto = await import('crypto');

        // Standard Webhooks format: v1,<timestamp>,<signature>
        const parts = signature.split(',');
        if (parts.length !== 3 || parts[0] !== 'v1') {
            console.error('[Polar] Invalid signature format');
            return false;
        }

        const timestamp = parts[1];
        const expectedSignature = parts[2];

        // Create the signed content: timestamp.payload
        const signedContent = `${timestamp}.${payload}`;

        // Calculate HMAC
        const hmac = crypto.createHmac('sha256', POLAR_WEBHOOK_SECRET);
        hmac.update(signedContent);
        const calculatedSignature = hmac.digest('base64');

        // Compare signatures (timing-safe)
        const isValid = crypto.timingSafeEqual(
            Buffer.from(expectedSignature),
            Buffer.from(calculatedSignature)
        );

        if (!isValid) {
            console.error('[Polar] Signature verification failed');
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
