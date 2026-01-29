import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { User } from "@shared/schema";

const JWT_SECRET_VALUE = process.env.JWT_SECRET;
if (!JWT_SECRET_VALUE) {
  throw new Error("JWT_SECRET environment variable is required for production");
}
const JWT_SECRET: string = JWT_SECRET_VALUE;
const JWT_EXPIRY = "7d";

export interface AuthToken {
  userId: string;
  email: string;
  plan: string;
  isAdmin: boolean;
}

// Hash password with bcrypt-like security
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString("hex"));
    });
  });
}

// Generate JWT token
export function generateToken(user: User): string {
  const payload: AuthToken = {
    userId: user.id,
    email: user.email,
    plan: user.plan,
    isAdmin: user.isAdmin || false,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// Verify JWT token
export function verifyToken(token: string): AuthToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthToken;
    return decoded;
  } catch (_error) {
    return null;
  }
}

// Extract token from header
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

