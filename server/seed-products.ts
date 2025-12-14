/**
 * Seed Products Script
 * Creates subscription products and prices in Stripe
 * Run this script to initialize your Stripe account with products
 *
 * Usage: npx tsx server/seed-products.ts
 */

import { getUncachableStripeClient } from './stripeClient';

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating Stripe products...');

  try {
    // Free Plan Product
    const freeProduct = await stripe.products.create({
      name: 'Free Plan',
      description: 'Free SaaS management plan - 5 tools limit',
      metadata: { tier: 'free', toolsLimit: '5' },
      type: 'service',
    });
    console.log('âœ“ Free Plan created:', freeProduct.id);

    // Standard Plan Product
    const standardProduct = await stripe.products.create({
      name: 'Standard Plan',
      description: 'Standard SaaS management plan - 12 tools + team collaboration',
      metadata: { tier: 'standard', toolsLimit: '12' },
      type: 'service',
    });
    console.log('âœ“ Standard Plan created:', standardProduct.id);

    // Premium Plan Product
    const premiumProduct = await stripe.products.create({
      name: 'Premium Plan',
      description: 'Premium SaaS management plan - Unlimited tools + API access',
      metadata: { tier: 'premium', toolsLimit: 'unlimited' },
      type: 'service',
    });
    console.log('âœ“ Premium Plan created:', premiumProduct.id);

    // Create prices for each product
    console.log('\nCreating prices...');

    // Standard Monthly
    const standardMonthly = await stripe.prices.create({
      product: standardProduct.id,
      unit_amount: 999, // $9.99
      currency: 'usd',
      recurring: { interval: 'month' },
      billing_scheme: 'per_unit',
      nickname: 'Standard Monthly',
    });
    console.log('âœ“ Standard Monthly ($9.99/mo):', standardMonthly.id);

    // Standard Yearly
    const standardYearly = await stripe.prices.create({
      product: standardProduct.id,
      unit_amount: 99900, // $99.99/year (save 2 months)
      currency: 'usd',
      recurring: { interval: 'year' },
      billing_scheme: 'per_unit',
      nickname: 'Standard Yearly',
    });
    console.log('âœ“ Standard Yearly ($99.99/yr):', standardYearly.id);

    // Premium Monthly
    const premiumMonthly = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 1999, // $19.99
      currency: 'usd',
      recurring: { interval: 'month' },
      billing_scheme: 'per_unit',
      nickname: 'Premium Monthly',
    });
    console.log('âœ“ Premium Monthly ($19.99/mo):', premiumMonthly.id);

    // Premium Yearly
    const premiumYearly = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 199900, // $199.99/year (save 4 months)
      currency: 'usd',
      recurring: { interval: 'year' },
      billing_scheme: 'per_unit',
      nickname: 'Premium Yearly',
    });
    console.log('âœ“ Premium Yearly ($199.99/yr):', premiumYearly.id);

    console.log('\nâœ… All products created successfully!');
    console.log('\nSave these IDs for your frontend:');
    console.log('Standard Monthly:', standardMonthly.id);
    console.log('Standard Yearly:', standardYearly.id);
    console.log('Premium Monthly:', premiumMonthly.id);
    console.log('Premium Yearly:', premiumYearly.id);

  } catch (error: any) {
    console.error('âŒ Error creating products:', error.message);
    process.exit(1);
  }
}

seedProducts();

