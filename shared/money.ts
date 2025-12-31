/**
 * Utility for handling monetary values using cent-based math to avoid floating point errors.
 * Storing amounts as integers (cents) is a standard practice for financial data.
 */

/**
 * Converts a decimal amount (e.g. 9.99) to cents (999).
 * Handles string or number inputs.
 */
export function toCents(amount: number | string | null | undefined): number {
    if (amount === null || amount === undefined || amount === "") return 0;
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
}

/**
 * Converts a cent amount (999) back to a decimal number (9.99).
 */
export function fromCents(cents: number | string | null | undefined): number {
    if (cents === null || cents === undefined || cents === "") return 0;
    const num = typeof cents === "string" ? parseInt(cents, 10) : cents;
    if (isNaN(num)) return 0;
    return num / 100;
}

/**
 * Strips non-numeric characters (except period) and returns the value in cents.
 */
export function parseCurrencyToCents(value: string): number {
    const cleanValue = value.replace(/[^\d.]/g, "");
    return toCents(cleanValue);
}

/**
 * Formats a cent amount as a human-readable string (e.g. "9.99").
 */
export function formatCents(cents: number): string {
    return (cents / 100).toFixed(2);
}
