import Stripe from 'stripe';

export async function getUncachableStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    // In production/VPS, we might want to throw if it's missing, but for now we can log a warning
    // or return undefined if the caller handles it. However, the original code assumed it could get credentials.
    // We will assume environment variables are set.
    console.warn("STRIPE_SECRET_KEY is not set.");
  }

  return new Stripe(secretKey || '', {
    apiVersion: '2025-08-27.basil',
  });
}

export async function getStripePublishableKey() {
  return process.env.STRIPE_PUBLISHABLE_KEY || '';
}

export async function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || '';
}
