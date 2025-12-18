import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is not set. Stripe functionality will not work.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});

export async function getStripePublishableKey() {
    return process.env.STRIPE_PUBLISHABLE_KEY || '';
}

export async function getStripeSync() {
    return null;
}
