-- Migration: Paddle to Polar.sh
-- This script migrates from Paddle payment system to Polar.sh

-- Step 1: Add new Polar columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS polar_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;

-- Step 2: Add new Polar column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS polar_order_id TEXT;

-- Step 3: (Optional) Copy data if you had test data in Paddle columns
-- UPDATE users SET polar_customer_id = paddle_customer_id WHERE paddle_customer_id IS NOT NULL;
-- UPDATE users SET polar_subscription_id = paddle_subscription_id WHERE paddle_subscription_id IS NOT NULL;
-- UPDATE payments SET polar_order_id = paddle_payment_id WHERE paddle_payment_id IS NOT NULL;

-- Step 4: Drop old Paddle columns (only if you're sure you don't need them!)
-- IMPORTANT: Only run these if you're 100% sure you don't need Paddle data
-- ALTER TABLE users DROP COLUMN IF EXISTS paddle_customer_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS paddle_subscription_id;
-- ALTER TABLE payments DROP COLUMN IF EXISTS paddle_payment_id;

-- Step 5: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_polar_customer ON users(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_polar_subscription ON users(polar_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_polar_order ON payments(polar_order_id);

-- Migration complete!
-- Next steps:
-- 1. Update your environment variables with Polar credentials
-- 2. Test webhooks using Polar's sandbox environment
-- 3. Deploy and monitor
