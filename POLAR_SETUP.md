# 🎉 Polar.sh Migration Complete!

## ✅ What Changed

Successfully migrated from **Paddle** to **Polar.sh** payment system:

- ✅ Installed `@polar-sh/sdk`
- ✅ Removed `@paddle/paddle-node-sdk`
- ✅ Updated database schema (Polar fields)
- ✅ Created backend integration (`server/lib/polar.ts`)
- ✅ Created frontend integration (`client/src/lib/polar.ts`)
- ✅ Updated webhook handler (`server/routes/billing.ts`)
- ✅ Updated pricing plans configuration
- ✅ Updated `PricingPage.tsx` and `Dashboard.tsx`
- ✅ Updated CSP headers in `server/app.ts`
- ✅ Created database migration script

---

## 🔑 REQUIRED: Environment Variables

Add these to your `.env` file:

```env
# =================================
# POLAR.SH (Payments) - PRODUCTION
# =================================

# Backend: API Keys (Get from https://polar.sh/dashboard/[org]/settings)
POLAR_ACCESS_TOKEN=polar_at_...
POLAR_WEBHOOK_SECRET=whsec_...
POLAR_ENV=production

# Frontend: Organization & Product IDs
VITE_POLAR_ORGANIZATION_ID=your_org_slug_or_id
VITE_POLAR_ENV=production

# Product Price IDs (create in Polar dashboard)
# Monthly pricing
VITE_POLAR_PRICE_ID_PRO=price_...
VITE_POLAR_PRICE_ID_ENTERPRISE=price_...

# Yearly pricing (optional, with discount)
VITE_POLAR_PRICE_ID_PRO_YEARLY=price_...
VITE_POLAR_PRICE_ID_ENTERPRISE_YEARLY=price_...

# Application URL (for success redirects)
VITE_APP_URL=https://yourdomain.com
```

---

## 📋 Setup Steps

### 1. Create Polar Account
1. Go to https://polar.sh
2. Sign up with GitHub
3. Create your organization

### 2. Get Your Organization ID
- Found in your dashboard URL: `https://polar.sh/dashboard/[YOUR_ORG_ID]/`
- Add to `.env` as `VITE_POLAR_ORGANIZATION_ID`

### 3. Create Products & Prices
1. Go to: https://polar.sh/dashboard/[your-org]/products
2. Create two products:
   - **Pro** ($9.99/month)
   - **Enterprise** ($24.99/month)
3. For each product, create TWO prices:
   - **Monthly** (recurring)
   - **Yearly** (recurring, with ~10% discount)
4. Copy the Price IDs and add to `.env`

### 4. Get API Credentials
1. Go to: https://polar.sh/dashboard/[your-org]/settings/api
2. Create an **Access Token** → Copy to `POLAR_ACCESS_TOKEN`
3. Create a **Webhook Secret** → Copy to `POLAR_WEBHOOK_SECRET`

### 5. Configure Webhook
1. Go to: https://polar.sh/dashboard/[your-org]/settings/webhooks
2. Add webhook endpoint: `https://yourdomain.com/api/billing/webhooks/polar`
3. Select events to send:
   - ✅ `order.created`
   - ✅ `subscription.created`
   - ✅ `subscription.active`
   - ✅ `subscription.updated`
   - ✅ `subscription.canceled`
   - ✅ `subscription.revoked`
4. Use the webhook secret you created in step 4

### 6. Run Database Migration
```bash
# Connect to your database and run:
psql $DATABASE_URL -f migrations/polar-migration.sql

# Or if using a different tool, execute the SQL in:
# migrations/polar-migration.sql
```

### 7. Test in Sandbox (Optional)
To test before going live:
```env
POLAR_ENV=sandbox
VITE_POLAR_ENV=sandbox
```

Then use Polar's sandbox dashboard to create test products.

---

## 🧪 Testing Checklist

Before going live, test:

- [ ] Pricing page loads correctly
- [ ] Clicking "Upgrade" opens Polar checkout popup
- [ ] Completing payment triggers webhook
- [ ] User plan upgrades in database
- [ ] Subscription limits are enforced
- [ ] Cancellation works correctly
- [ ] Webhook signature verification works

---

## 📊 Polar.sh vs Paddle

### Why Polar is Better:

| Feature | Polar.sh | Paddle |
|---------|----------|--------|
| **Fees** | 5% + payment processing | 5% + $0.50 per transaction |
| **Developer Experience** | Excellent (built for devs) | Good |
| **Sandbox Testing** | Free, fully isolated | Limited |
| **Webhooks** | Standard Webhooks spec | Custom implementation |
| **TypeScript SDK** | First-class support | Good |
| **Checkout UX** | Modern, embedded | Popup overlay |
| **Target Audience** | Developer tools, SaaS | General SaaS |

---

## 🚨 Important Notes

1. **Production Keys**: You mentioned you'll add production keys - perfect! Make sure to use production keys, not sandbox.

2. **Old Paddle Data**: The migration script keeps old Paddle columns temporarily. Once you verify everything works, you can drop them by uncommenting lines in `migrations/polar-migration.sql`.

3. **Existing Users**: Since you have no customers yet, there's nothing to migrate! Clean slate 🎉

4. **Price IDs**: Make sure the price IDs in your `.env` match EXACTLY with those in Polar dashboard.

5. **Webhook Endpoint**: Must be publicly accessible. Test with tools like https://webhook.site first.

---

## 🆘 Troubleshooting

### Checkout doesn't open
- ✅ Check browser console for errors
- ✅ Verify `VITE_POLAR_ORGANIZATION_ID` is set
- ✅ Check popup blocker settings

### Webhook not receiving
- ✅ Verify webhook URL is publicly accessible
- ✅ Check webhook secret matches
- ✅ Review webhook delivery logs in Polar dashboard

### Plan not upgrading
- ✅ Check server logs for webhook processing errors
- ✅ Verify price ID mapping in `server/routes/billing.ts`
- ✅ Ensure `userId` is passed in checkout metadata

---

## 🎯 Next Steps

1. ✅ Add environment variables to your `.env` file
2. ✅ Run the database migration
3. ✅ Create products in Polar dashboard
4. ✅ Configure webhook endpoint
5. ✅ Test the checkout flow
6. ✅ Deploy and monitor

---

## 📞 Support

- **Polar Documentation**: https://docs.polar.sh
- **Polar API Reference**: https://api.polar.sh/docs
- **Polar Discord**: https://discord.gg/polarsh

Enjoy your new payment system! 🚀
