-- Migration: Add payment signal fields to detected_sites table
-- Created: 2026-01-26
-- Purpose: Support subscription probability scoring

-- Add new columns for payment signal tracking
ALTER TABLE detected_sites 
ADD COLUMN IF NOT EXISTS visited_billing_page BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS billing_page_url TEXT,
ADD COLUMN IF NOT EXISTS usage_intensity TEXT DEFAULT 'low',
ADD COLUMN IF NOT EXISTS subscription_probability INTEGER DEFAULT 0 NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN detected_sites.visited_billing_page IS 'True if user visited a billing/payment page for this domain';
COMMENT ON COLUMN detected_sites.billing_page_url IS 'Last visited billing page URL';
COMMENT ON COLUMN detected_sites.usage_intensity IS 'Calculated usage intensity: low, medium, high based on visit frequency';
COMMENT ON COLUMN detected_sites.subscription_probability IS 'Calculated probability (0-100) that this is a paid subscription';

-- Create index for probability queries
CREATE INDEX IF NOT EXISTS detected_probability_idx ON detected_sites(subscription_probability DESC);
