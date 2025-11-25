# Stripe Integration Setup Guide

Your SaaS Tools Hub now has **full Stripe payment integration** ready to use! Follow this guide to activate it.

## ✅ What's Already Done

- ✅ Stripe packages installed (`stripe@18.5.0`, `stripe-replit-sync@0.0.12`)
- ✅ Backend files created (stripeClient, stripeService, webhookHandlers, stripeRoutes)
- ✅ Database schema ready (stripeCustomerId, stripeSubscriptionId fields)
- ✅ Webhook infrastructure configured
- ✅ Secure credential management via Replit

## 📋 Step-by-Step Setup

### Step 1: Finalize Backend Integration (2 minutes)

Add these two lines to `server/routes.ts`:

**At the top of the file (after other imports):**
```typescript
import { registerStripeRoutes } from "./stripeRoutes";
```

**At the end of the `registerRoutes` function, before `return httpServer;` (around line 218):**
```typescript
await registerStripeRoutes(app);
```

### Step 2: Create Subscription Products (5 minutes)

Run this command in your terminal:
```bash
npx tsx server/seed-products.ts
```

This creates:
- **Free Plan** - Display only (no Stripe price)
- **Standard Plan** - $9.99/month or $99.99/year
- **Premium Plan** - $19.99/month or $199.99/year

**Output will show:**
```
✓ Free Plan created: prod_xxxxx
✓ Standard Plan created: prod_xxxxx
✓ Premium Plan created: prod_xxxxx

✓ Standard Monthly ($9.99/mo): price_xxxxx
✓ Standard Yearly ($99.99/yr): price_xxxxx
✓ Premium Monthly ($19.99/mo): price_xxxxx
✓ Premium Yearly ($199.99/yr): price_xxxxx
```

**Save these price IDs** - you'll need them for the frontend.

### Step 3: Test the Backend

Restart the app:
```bash
npm run dev
```

Test the API:
```bash
# Get all products
curl http://localhost:5000/api/stripe/products

# Get product prices
curl http://localhost:5000/api/stripe/products/{productId}/prices
```

### Step 4: Frontend Integration

**Update your pricing page to use Stripe:**

```typescript
// In client/src/pages/PricingPage.tsx or similar
import { useQuery } from "@tanstack/react-query";

export function PricingPage() {
  const { data: products } = useQuery({
    queryKey: ['/api/stripe/products'],
    // Already configured to fetch from /api/stripe/products
  });

  // Render products with prices
  // Add checkout button:
  const handleCheckout = async (priceId: string) => {
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId })
    });
    const { url } = await response.json();
    window.location.href = url; // Redirect to Stripe checkout
  };
}
```

### Step 5: Deploy to Production

When ready to go live, Replit automatically:
1. Copies your Stripe products from test to live mode
2. Updates webhook configurations
3. Syncs subscription data

No extra work needed!

## 🔑 API Endpoints

### Public Endpoints (No Auth Required)
- `GET /api/stripe/products` - List all active products
- `GET /api/stripe/products/:productId/prices` - Get prices for a product

### Protected Endpoints (Auth Required)
- `POST /api/stripe/checkout` - Create checkout session
  ```json
  { "priceId": "price_xxxxx" }
  ```
  Returns: `{ "url": "https://checkout.stripe.com/..." }`

- `POST /api/stripe/customer-portal` - Create customer portal session (manage subscriptions)
  Returns: `{ "url": "https://billing.stripe.com/..." }`

## 🧪 Test in Development

### Using Stripe Test Cards:
- **Visa Success:** 4242 4242 4242 4242
- **Card Declined:** 4000 0000 0000 0002
- **Expired:** 4000 0000 0000 0069

Any expiry date (future), any 3-digit CVC

### Webhook Testing:
Webhooks are automatically configured. You can test them from your Stripe Dashboard:
1. Go to Developers → Webhooks
2. Find your managed webhook (UUID-based)
3. Click "Send test webhook"

## 📊 What Happens When User Subscribes

1. User clicks "Upgrade to Premium"
2. Redirected to Stripe checkout (`/api/stripe/checkout`)
3. User enters payment details
4. Stripe validates and charges
5. Webhook received: `customer.subscription.created`
6. Database automatically synced:
   - `users.stripeCustomerId` - Stripe customer ID
   - `users.stripeSubscriptionId` - Stripe subscription ID
   - `users.plan` - Updated to "standard" or "premium"
7. User redirected to success page

## 🔄 Ongoing Management

### Update Product Pricing
```bash
# Modify in Stripe Dashboard, OR:
# Run seed script again to create new prices
npx tsx server/seed-products.ts
```

### View Subscriptions
```typescript
// In backend route:
const subscription = await stripe.subscriptions.retrieve(subscriptionId);
console.log(subscription.status); // active, canceled, past_due, etc.
```

### Cancel Subscription
```typescript
// Via customer portal (user self-service) OR:
const subscription = await stripe.subscriptions.del(subscriptionId);
```

### Handle Cancellations
Stripe webhook `customer.subscription.deleted` automatically updates:
- `users.plan` → "free"
- `users.stripeSubscriptionId` → null

## 🚨 Production Checklist

- [ ] Update pricing in seed-products.ts to your actual prices
- [ ] Test full checkout flow with Stripe test cards
- [ ] Configure email receipts in Stripe Dashboard
- [ ] Add legal links (Terms, Privacy) to checkout page
- [ ] Set up Stripe email templates
- [ ] Test webhook retry logic (Stripe will retry for 3 days if your server is down)
- [ ] Monitor Stripe Dashboard for failed payments
- [ ] Set up Stripe alerts for unusual activity

## 💡 Pro Tips

1. **Metadata:** Add custom data to subscriptions:
   ```typescript
   await stripe.subscriptions.update(subscriptionId, {
     metadata: { teamId: user.teamId, features: 'api_access' }
   });
   ```

2. **Idempotency:** Stripe is idempotent by default - retrying requests with same data is safe

3. **Soft Deletes:** Never delete subscriptions - keep them for records, just mark as cancelled

4. **Webhooks:** Always verify webhook signatures (already done in webhookHandlers.ts)

5. **Testing:** Use Stripe test mode forever - switch to live only when deploying to production

## ❓ Common Issues

**Issue:** Webhook not updating database
- **Fix:** Check that webhook UUID in logs matches Stripe Dashboard
- **Fix:** Ensure DATABASE_URL is set correctly

**Issue:** Checkout button shows "Not authenticated"
- **Fix:** Ensure user is logged in before showing upgrade button
- **Fix:** Pass JWT token in Authorization header

**Issue:** "Price not found" error
- **Fix:** Make sure you used price IDs from `seed-products.ts` output
- **Fix:** Price must be in same Stripe account (test vs live)

## 📚 Next Steps

1. **Frontend:** Update Pricing page to use Stripe endpoints
2. **Notifications:** Add email on subscription status changes
3. **Analytics:** Track conversion rates from free → paid
4. **Dunning:** Set up automatic retry for failed payments
5. **Invoicing:** Enable auto-generated invoices in Stripe Dashboard

---

**Need Help?** Check Stripe docs: https://docs.stripe.com
