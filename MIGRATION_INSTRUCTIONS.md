# Database Migration Instructions

## Phase 1: Smart Tracker Enhancement

### Running the Migration

The following SQL migrations need to be run on your database to add payment signal fields:

#### Option 1: Via psql (if installed)
```bash
psql $DATABASE_URL -f server/migrations/add_payment_signals.sql
psql $DATABASE_URL -f server/migrations/probability_functions.sql
```

#### Option 2: Via Database Client (Neon, pgAdmin, etc.)
1. Connect to your database using your preferred client
2. Run the SQL from `server/migrations/add_payment_signals.sql`
3. Run the SQL from `server/migrations/probability_functions.sql`

#### Option 3: Via Node Script
```bash
# From project root
node server/run-migration.js
```

### Migration Files

- **add_payment_signals.sql** - Adds payment signal columns to `detected_sites` table
- **probability_functions.sql** - Creates PostgreSQL functions for probability calculation

### Verification

After running migrations, verify with:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'detected_sites' 
  AND column_name IN ('visited_billing_page', 'billing_page_url', 'subscription_probability', 'usage_intensity');
```

Expected output:
```
visited_billing_page    | boolean
billing_page_url        | text
subscription_probability| integer
usage_intensity         | text
```

### Rollback (if needed)

If you need to rollback:
```sql
ALTER TABLE detected_sites 
DROP COLUMN IF EXISTS visited_billing_page,
DROP COLUMN IF EXISTS billing_page_url,
DROP COLUMN IF EXISTS usage_intensity,
DROP COLUMN IF EXISTS subscription_probability;

DROP INDEX IF EXISTS detected_probability_idx;
```
