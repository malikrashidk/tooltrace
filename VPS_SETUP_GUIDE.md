# Tool Trace - VPS Setup Guide for Stripe & 2FA

This guide helps you configure Stripe payments and Two-Factor Authentication (2FA) after deploying Tool Trace to your VPS.

## Prerequisites

- Tool Trace deployed and running on your VPS
- Access to your VPS via SSH
- Domain name pointed to your VPS (recommended)

---

## Part 1: Stripe Payment Setup

### Step 1: Create Stripe Account

1. Go to [https://stripe.com](https://stripe.com)
2. Click "Start now" to create an account
3. Complete the registration process
4. Verify your email address

### Step 2: Get Stripe API Keys

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** in the left sidebar
3. Click **API keys**
4. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...` for test mode)
   - **Secret key** (starts with `sk_test_...` for test mode)

⚠️ **Important**: Keep your secret key private! Never commit it to Git or share it publicly.

### Step 3: Set Environment Variables on VPS

SSH into your VPS and add the Stripe keys:

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to your app directory
cd /opt/tooltrace

# Edit the environment file
nano .env
```

Add these lines to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

Save the file (`Ctrl+X`, then `Y`, then `Enter`).

### Step 4: Create Stripe Products

Run the product seeding script to create your subscription plans:

```bash
# Make sure you're in the app directory
cd /opt/tooltrace

# Run the seed script
docker-compose exec app npx tsx server/seed-products.ts
```

This creates three products in Stripe:
- **Free Plan**: $0/month (5 tools limit)
- **Standard Plan**: $9.99/month or $99.99/year (12 tools)
- **Premium Plan**: $19.99/month or $199.99/year (unlimited tools)

### Step 5: Configure Stripe Webhooks

Webhooks allow Stripe to notify your app about payment events.

1. In [Stripe Dashboard](https://dashboard.stripe.com), go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your endpoint URL:
   ```
   https://your-domain.com/api/stripe/webhook
   ```
   (Replace `your-domain.com` with your actual domain)

4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

### Step 6: Test Stripe Integration

Use Stripe test cards to verify payments work:

**Test Card Numbers:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires 3D Secure: `4000 0025 0000 3155`

**Test Details:**
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

### Step 7: Switch to Live Mode (Production)

When ready for real payments:

1. Complete Stripe account activation
2. In Stripe Dashboard, toggle to **Live mode**
3. Get your live API keys (starts with `pk_live_...` and `sk_live_...`)
4. Update `.env` with live keys:
   ```bash
   STRIPE_SECRET_KEY=sk_live_your_live_secret_key
   STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key
   ```
5. Update webhook endpoint to use live mode
6. Restart your app:
   ```bash
   docker-compose restart app
   ```

---

## Part 2: Two-Factor Authentication (2FA) Setup

2FA is already built into Tool Trace! Here's how users can enable it:

### For Users: Enabling 2FA

1. Log in to Tool Trace
2. Go to **Settings** (click your avatar → Settings)
3. Scroll to **Security** section
4. Click **Enable Two-Factor Authentication**
5. Scan the QR code with an authenticator app:
   - Google Authenticator (iOS/Android)
   - Authy (iOS/Android/Desktop)
   - Microsoft Authenticator (iOS/Android)
   - 1Password (if you have it)
6. Enter the 6-digit code from your authenticator
7. **Save your backup codes** in a safe place!
8. Click **Enable 2FA**

### For Admins: 2FA Configuration

No server-side configuration needed! 2FA is ready to use out of the box.

The system:
- Uses TOTP (Time-based One-Time Password) standard
- Generates QR codes for easy setup
- Provides 10 backup codes for account recovery
- Encrypts 2FA secrets in the database

### Backup Codes

Each user gets 10 single-use backup codes. Users should:
- **Download** or **copy** backup codes after enabling 2FA
- Store them securely (password manager, encrypted file, or printed)
- Use them if they lose access to their authenticator app

### Disabling 2FA

To disable 2FA (requires authentication):
1. Go to **Settings** → **Security**
2. Click **Disable Two-Factor Authentication**
3. Enter your password
4. Enter a 2FA code (from authenticator or backup code)
5. Click **Disable 2FA**

---

## Part 3: Testing Your Setup

### Test Stripe Payments

1. Visit your Tool Trace app
2. Go to **Pricing** page
3. Click **Upgrade to Standard**
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify:
   - Plan upgraded in your account
   - Tools limit increased
   - No data loss

### Test 2FA

1. Create a test user account
2. Enable 2FA following the steps above
3. Log out
4. Log back in - should prompt for 2FA code
5. Enter code from authenticator
6. Verify successful login

---

## Part 4: Security Best Practices

### Stripe Security

- ✅ Never expose `STRIPE_SECRET_KEY` in frontend code
- ✅ Use webhook signature verification (already implemented)
- ✅ Enable Stripe Radar for fraud detection
- ✅ Set up email notifications for payments
- ✅ Regularly review Stripe Dashboard for suspicious activity

### 2FA Security

- ✅ Encourage all users (especially admins) to enable 2FA
- ✅ Backup codes are one-time use only
- ✅ 2FA secrets are encrypted in database
- ✅ Users should use strong passwords + 2FA for maximum security

### General VPS Security

- ✅ Keep system packages updated: `sudo apt update && sudo apt upgrade`
- ✅ Enable firewall (UFW): `sudo ufw enable`
- ✅ Use SSH keys instead of passwords
- ✅ Regular backups (database + app files)
- ✅ Monitor logs for suspicious activity

---

## Part 5: Troubleshooting

### Stripe Issues

**Problem**: "Stripe not configured" error
- **Solution**: Check `.env` file has correct `STRIPE_SECRET_KEY`
- **Solution**: Restart app: `docker-compose restart app`

**Problem**: Webhooks not working
- **Solution**: Verify webhook URL is correct and publicly accessible
- **Solution**: Check webhook signing secret in `.env`
- **Solution**: Test webhook in Stripe Dashboard → Webhooks → Send test event

**Problem**: Payments fail immediately
- **Solution**: Check Stripe Dashboard logs
- **Solution**: Verify API keys are for the correct mode (test vs live)

### 2FA Issues

**Problem**: Lost authenticator app
- **Solution**: Use backup codes to log in
- **Solution**: If no backup codes, admin must disable 2FA in database

**Problem**: QR code won't scan
- **Solution**: Manually enter the secret key shown below QR code
- **Solution**: Try different authenticator app

**Problem**: Invalid 2FA code
- **Solution**: Check device time is correct (TOTP requires accurate time)
- **Solution**: Wait 30 seconds for new code
- **Solution**: Use backup code instead

---

## Part 6: Monitoring & Maintenance

### Monitor Stripe Activity

1. Check [Stripe Dashboard](https://dashboard.stripe.com) daily
2. Review:
   - Payment success rate
   - Failed payments
   - Customer subscriptions
   - Webhook delivery status

### Monitor 2FA Usage

Check your database for 2FA statistics:

```bash
docker-compose exec postgres psql -U postgres -d tooltrace -c "
SELECT 
  COUNT(*) as total_users,
  SUM(CASE WHEN two_factor_enabled THEN 1 ELSE 0 END) as users_with_2fa,
  ROUND(100.0 * SUM(CASE WHEN two_factor_enabled THEN 1 ELSE 0 END) / COUNT(*), 2) as adoption_rate
FROM users;
"
```

---

## Quick Reference

### Restart App After Config Changes

```bash
cd /opt/tooltrace
docker-compose restart app
```

### View App Logs

```bash
docker-compose logs -f app
```

### Stripe Test Cards

| Purpose | Card Number | Result |
|---------|-------------|--------|
| Success | 4242 4242 4242 4242 | Payment succeeds |
| Decline | 4000 0000 0000 0002 | Payment declined |
| 3D Secure | 4000 0025 0000 3155 | Requires authentication |

### Authenticator Apps

- Google Authenticator: [iOS](https://apps.apple.com/app/google-authenticator/id388497605) / [Android](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)
- Authy: [Download](https://authy.com/download/)
- Microsoft Authenticator: [iOS](https://apps.apple.com/app/microsoft-authenticator/id983156458) / [Android](https://play.google.com/store/apps/details?id=com.azure.authenticator)

---

## Support

For additional help:
- Check application logs: `docker-compose logs -f app`
- Review [Stripe Documentation](https://stripe.com/docs)
- Read [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238) for 2FA details

---

**Last Updated**: December 2024
**Tool Trace Version**: 1.0.0
