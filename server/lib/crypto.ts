import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard IV length
const TAG_LENGTH = 16; // GCM auth tag length

export interface EncryptedData {
    ciphertext: string;
    iv: string;
    tag: string;
    salt?: string;
}

/**
 * Encrypts a string using AES-256-GCM.
 * Returns an EncryptedData object.
 */
export function encrypt(text: string): EncryptedData {
    if (!process.env.OAUTH_TOKEN_ENC_KEY && !process.env.ENCRYPTION_KEY) {
        throw new Error("Encryption key not defined in environment");
    }

    const secret = process.env.OAUTH_TOKEN_ENC_KEY || process.env.ENCRYPTION_KEY!;
    const key = Buffer.from(secret, "base64");
    if (key.length !== 32) {
        throw new Error("Encryption key must be a 32-byte base64 encoded string");
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return {
        ciphertext: encrypted.toString("hex"),
        iv: iv.toString("hex"),
        tag: tag.toString("hex")
    };
}

/**
 * Encrypts a string and returns a single base64 string (iv + tag + ciphertext).
 * Useful for databases storing encryption as a single text column.
 */
export function encryptToString(text: string): string {
    const data = encrypt(text);
    const iv = Buffer.from(data.iv, "hex");
    const tag = Buffer.from(data.tag, "hex");
    const ciphertext = Buffer.from(data.ciphertext, "hex");

    return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/**
 * Decrypts an EncryptedData object or a combined base64 string.
 */
export function decrypt(data: EncryptedData | string): string {
    if (!process.env.OAUTH_TOKEN_ENC_KEY && !process.env.ENCRYPTION_KEY) {
        throw new Error("Encryption key not defined in environment");
    }

    const secret = process.env.OAUTH_TOKEN_ENC_KEY || process.env.ENCRYPTION_KEY!;
    const key = Buffer.from(secret, "base64");
    if (key.length !== 32) {
        throw new Error("Encryption key must be a 32-byte base64 encoded string");
    }

    let iv: Buffer;
    let tag: Buffer;
    let encrypted: Buffer;

    if (typeof data === "string") {
        const buffer = Buffer.from(data, "base64");
        iv = buffer.subarray(0, IV_LENGTH);
        tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);
    } else {
        iv = Buffer.from(data.iv, "hex");
        tag = Buffer.from(data.tag, "hex");
        encrypted = Buffer.from(data.ciphertext, "hex");
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);

    return decrypted.toString("utf8");
}
