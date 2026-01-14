/**
 * Environment Variable Validation
 * Ensures all required variables are set for production
 */

const REQUIRED_PRODUCTION_VARS = [
  'JWT_SECRET',
  'DATABASE_URL',
  'POLAR_ACCESS_TOKEN',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'MAIL_FROM',
];

const OPTIONAL_PRODUCTION_VARS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
];

/**
 * Validate that all required environment variables are set
 * Throws error if any critical variables are missing in production
 */
export function validateEnvironmentVariables(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'production') {
    const missing = REQUIRED_PRODUCTION_VARS.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      console.error('[ENV Validation] Missing required environment variables in production:');
      missing.forEach(varName => {
        console.error(`  - ${varName}`);
      });
      throw new Error(`Missing ${missing.length} required environment variable(s) for production`);
    }
    
    console.log('[ENV Validation] ✅ All required environment variables are set');
  } else {
    // Development - just warn about missing optional vars
    const missingOptional = OPTIONAL_PRODUCTION_VARS.filter(varName => !process.env[varName]);
    if (missingOptional.length > 0) {
      console.warn('[ENV Validation] Optional variables not set (development mode):');
      missingOptional.forEach(varName => {
        console.warn(`  - ${varName} (optional)`);
      });
    }
  }
}

/**
 * Get environment variable with validation
 * Throws error if variable doesn't exist
 */
export function getRequiredEnv(varName: string): string {
  const value = process.env[varName];
  if (!value) {
    throw new Error(`Environment variable ${varName} is required but not set`);
  }
  return value;
}

/**
 * Get environment variable with optional fallback
 */
export function getEnv(varName: string, defaultValue?: string): string {
  return process.env[varName] || defaultValue || '';
}
