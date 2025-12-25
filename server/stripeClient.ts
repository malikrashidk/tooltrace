import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil' as any,
  typescript: true,
});

export async function getUncachableStripeClient() {
  return stripe;
}

export async function getStripePublishableKey() {
  return process.env.STRIPE_PUBLISHABLE_KEY || '';
}

export async function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || '';
}

// Keeping this for compatibility if imported, but it returns the same instance
export async function getStripeSync() {
    console.warn("getStripeSync is deprecated and returns null/mock. Use direct stripe client.");
    return {
        processWebhook: async () => {
             console.warn("StripeSync.processWebhook called but stripe-replit-sync is removed. Use server/webhookHandlers.ts directly.");
        }
    };
}
