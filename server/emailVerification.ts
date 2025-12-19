import crypto from "crypto";

const VERIFY_TOKEN_TTL_HOURS = 24;

export function generateEmailVerifyToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60 * 1000);
  return { raw, hash, expiresAt };
}

export function hashVerifyToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

