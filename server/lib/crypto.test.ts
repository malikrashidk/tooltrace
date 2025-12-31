import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../server/lib/crypto";

describe("Encryption", () => {
    it("should encrypt and decrypt correctly", () => {
        // Setting dummy key for test if not present
        process.env.OAUTH_TOKEN_ENC_KEY = Buffer.alloc(32).toString("base64");

        const text = "hello-world-secret";
        const encrypted = encrypt(text);
        const decrypted = decrypt(encrypted);

        expect(decrypted).toBe(text);
        expect(encrypted).not.toBe(text);
    });
});
