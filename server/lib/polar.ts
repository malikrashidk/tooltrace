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
        const signature = headers['webhook-signature'] as string;
        if (!signature) {
            console.error('[Polar] No webhook signature found in headers');
            return false;
        }

        // Standard Webhooks format: v1,<timestamp>,<signature>
        const parts = signature.split(',');

        let timestamp: string = '';
        let signaturePart: string = '';

        // Some implementations might have 'v1,t=...,v=...' or just 'v1,timestamp,signature'
        if (parts.length === 3 && parts[0] === 'v1') {
            // Format: v1,timestamp,signature
            timestamp = parts[1];
            signaturePart = parts[2];
        } else {
            // Try to find parts by prefix if standard split fails
            for (const part of parts) {
                if (part.startsWith('t=')) timestamp = part.substring(2);
                else if (part.startsWith('v1=')) signaturePart = part.substring(3);
                else if (timestamp === '' && /^\d+$/.test(part)) timestamp = part;
                else if (signaturePart === '' && part !== 'v1') signaturePart = part;
            }
        }

        if (!timestamp || !signaturePart) {
            console.error('[Polar] Could not parse signature components:', { signature, timestamp, signaturePart });
            return false;
        }

        const crypto = await import('crypto');

        // Signed content is: msg_id.timestamp.payload 
        // Note: Polar follows Standard Webhooks which includes webhook-id in the signed content
        const webhookId = headers['webhook-id'] as string || '';
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
