/**
 * Security utilities and best practices for the application
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isStrong: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain uppercase letters");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain lowercase letters");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain numbers");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push("Password must contain special characters");
  }

  return {
    isStrong: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Rate limiting helper - tracks attempts with timestamps
 */
export class RateLimiter {
  private attempts: number[] = [];
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isLimited(): boolean {
    const now = Date.now();
    // Remove attempts outside the window
    this.attempts = this.attempts.filter((timestamp) => now - timestamp < this.windowMs);

    if (this.attempts.length >= this.maxAttempts) {
      return true;
    }

    this.attempts.push(now);
    return false;
  }

  reset(): void {
    this.attempts = [];
  }

  getRemainingAttempts(): number {
    const now = Date.now();
    this.attempts = this.attempts.filter((timestamp) => now - timestamp < this.windowMs);
    return Math.max(0, this.maxAttempts - this.attempts.length);
  }
}

/**
 * Content Security Policy recommendations for headers
 * (To be implemented on backend)
 */
export const CSP_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

/**
 * Generate CSRF token (simplified - should be server-generated in production)
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Check if using HTTPS (except for localhost)
 */
export function isSecureConnection(): boolean {
  return window.location.protocol === "https:" || window.location.hostname === "localhost";
}

/**
 * Lock down browser storage to prevent XSS
 */
export function securifyBrowserStorage(): void {
  // Disable access to sensitive storage from console
  Object.defineProperty(window, "localStorage", {
    value: localStorage,
    writable: false,
    configurable: false,
  });

  Object.defineProperty(window, "sessionStorage", {
    value: sessionStorage,
    writable: false,
    configurable: false,
  });
}

/**
 * Audit log for sensitive operations
 */
export interface AuditLogEntry {
  timestamp: string;
  action: string;
  userId?: string;
  toolId?: string;
  details?: string;
}

export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 100;

  log(action: string, userId?: string, toolId?: string, details?: string): void {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      toolId,
      details,
    };

    this.logs.push(entry);

    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In production, send to server for persistent storage
    console.log("[AUDIT]", entry);
  }

  getLogs(): AuditLogEntry[] {
    return [...this.logs];
  }
}

export const auditLogger = new AuditLogger();



