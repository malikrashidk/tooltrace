import { type Express } from 'express';
import { getUncachableStripeClient } from './stripeClient';
import { stripeService } from './stripeService';

export async function registerStripeRoutes(app: Express) {
  // Get published products
  app.get('/api/stripe/products', async (req, res) => {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 100 });
    res.json({ data: products.data });
  });

  // Get product with prices
  app.get('/api/stripe/products/:productId/prices', async (req, res) => {
    const stripe = await getUncachableStripeClient();
    const prices = await stripe.prices.list({ product: req.params.productId, active: true });
    res.json({ data: prices.data });
  });

  // Create checkout session
  app.post('/api/stripe/checkout', async (req: any, res) => {
    try {
      const user = req.user;
      const { priceId } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: 'Price ID required' });
      }

      // Create or get customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email, user.id);
        customerId = customer.id;
        // Update user with Stripe customer ID (would need storage layer)
      }

      // Create checkout session
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${req.protocol}://${req.get('host')}/checkout/success`,
        `${req.protocol}://${req.get('host')}/checkout/cancel`
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Checkout error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Create customer portal session (manage subscriptions)
  app.post('/api/stripe/customer-portal', async (req: any, res) => {
    try {
      const user = req.user;
      if (!user.stripeCustomerId) {
        return res.status(400).json({ error: 'No active subscription' });
      }

      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${req.protocol}://${req.get('host')}/dashboard`
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Portal error:', error);
      res.status(400).json({ error: error.message });
    }
  });
}

