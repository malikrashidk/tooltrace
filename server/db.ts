import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Raw SQL client for queries
export const sql = neon(connectionString);

// Safe query execution helper
export async function safeQuery<T = any>(
  queryFn: () => Promise<T[]>
): Promise<T[]> {
  try {
    const result = await queryFn();
    return result || [];
  } catch (error: any) {
    if (error?.message?.includes("Cannot read properties of null")) {
      console.warn("[SQL] Neon library returned null, returning empty array");
      return [];
    }
    throw error;
  }
}

// Drizzle instance for schema management
export const db = drizzle(sql, { schema });

