/**
 * Client-side encryption utilities for secure credential storage
 * Uses Web Crypto API for browser-native encryption without external dependencies
 */

const ENCRYPTION_KEY_STORAGE = "saazhub_encryption_key";
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;

/**
 * Generate or retrieve encryption key from browser storage
 * In production, this should be derived from user's password or secure key exchange
 */
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  const storedKey = sessionStorage.getItem(ENCRYPTION_KEY_STORAGE);

  if (storedKey) {
    try {
      const keyData = JSON.parse(storedKey);
      return await crypto.subtle.importKey("jwk", keyData, { name: ALGORITHM }, true, [
        "encrypt",
        "decrypt",
      ]);
    } catch (error) {
      console.error("Failed to import stored key, generating new one", error);
    }
  }

  // Generate new key
  const key = await crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_LENGTH }, true, [
    "encrypt",
    "decrypt",
  ]);

  // Store key in session storage (only available for this session)
  const exportedKey = await crypto.subtle.exportKey("jwk", key);
  sessionStorage.setItem(ENCRYPTION_KEY_STORAGE, JSON.stringify(exportedKey));

  return key;
}

/**
 * Encrypt sensitive data (credentials)
 */
export async function encryptCredential(data: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(data);

    // Generate random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, plaintext);

    // Combine IV + ciphertext and encode as base64 for storage
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode.apply(null, Array.from(combined)));
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt credential. Please try again.");
  }
}

/**
 * Decrypt sensitive data (credentials)
 */
export async function decryptCredential(encrypted: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();

    // Decode base64
    const combined = new Uint8Array(atob(encrypted).split("").map((c) => c.charCodeAt(0)));

    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    // Decrypt
    const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);

    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt credential. The data may be corrupted.");
  }
}

/**
 * Clear encryption key from session storage
 * Call this on logout
 */
export function clearEncryptionKey(): void {
  sessionStorage.removeItem(ENCRYPTION_KEY_STORAGE);
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => chars[byte % chars.length])
    .join("");
}

/**
 * Hash a password for verification (not reversible)
 * Used for local verification only
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
