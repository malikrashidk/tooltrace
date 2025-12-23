import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard IV length
const TAG_LENGTH = 16; // GCM auth tag length

/**
 * Encrypts a string using AES-256-GCM.
 * Output format: base64(iv + authTag + encryptedData)
 */
export function encrypt(text: string): string {
    if (!process.env.OAUTH_TOKEN_ENC_KEY) {
        throw new Error("OAUTH_TOKEN_ENC_KEY is not defined in environment");
    }

    // Ensure the key is 32 bytes for AES-256
    const key = Buffer.from(process.env.OAUTH_TOKEN_ENC_KEY, "base64");
    if (key.length !== 32) {
        throw new Error("OAUTH_TOKEN_ENC_KEY must be a 32-byte base64 encoded string");
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    // Combine IV, Tag, and Ciphertext into one Buffer then convert to Base64
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypts a base64 encoded string (iv + authTag + encryptedData) using AES-256-GCM.
 */
export function decrypt(data: string): string {
    if (!process.env.OAUTH_TOKEN_ENC_KEY) {
        throw new Error("OAUTH_TOKEN_ENC_KEY is not defined in environment");
    }

    const key = Buffer.from(process.env.OAUTH_TOKEN_ENC_KEY, "base64");
    if (key.length !== 32) {
        throw new Error("OAUTH_TOKEN_ENC_KEY must be a 32-byte base64 encoded string");
    }

    const buffer = Buffer.from(data, "base64");

    // Extract parts from the combined buffer
    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);

    return decrypted.toString("utf8");
}
