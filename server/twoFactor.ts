import { authenticator } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";

const APP_NAME = "ToolTrace";

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  manualCode: string;
}

export interface BackupCodes {
  codes: string[];
  hashedCodes: string[];
}

export function generateSecret(): string {
  return authenticator.generateSecret();
}

export async function generateQRCode(email: string, secret: string): Promise<TwoFactorSetup> {
  const otpauth = authenticator.keyuri(email, APP_NAME, secret);
  const qrCode = await QRCode.toDataURL(otpauth);
  
  return {
    secret,
    qrCode,
    manualCode: secret,
  };
}

export function verifyToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

export function generateBackupCodes(): BackupCodes {
  const codes: string[] = [];
  const hashedCodes: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;
    codes.push(formattedCode);
    hashedCodes.push(hashBackupCode(formattedCode));
  }
  
  return { codes, hashedCodes };
}

export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.replace("-", "").toLowerCase()).digest("hex");
}

export function verifyBackupCode(inputCode: string, hashedCodes: string[]): { valid: boolean; remainingCodes: string[] } {
  const hashedInput = hashBackupCode(inputCode);
  const index = hashedCodes.indexOf(hashedInput);
  
  if (index === -1) {
    return { valid: false, remainingCodes: hashedCodes };
  }
  
  const remainingCodes = [...hashedCodes];
  remainingCodes.splice(index, 1);
  
  return { valid: true, remainingCodes };
}

