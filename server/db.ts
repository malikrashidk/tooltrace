import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

let sql: any;
let db: any;

export async function safeQuery<T = any>(queryFn: () => Promise<T[]>): Promise<T[]> {
  if (!connectionString) return [];
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

if (!connectionString) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL must be set in production environment");
  }
  console.warn("[db] DATABASE_URL not set — running without DB (in-memory mode)");
  sql = { __noDb: true } as any;
  db = null as any;
} else {
  // Raw SQL client for queries
  sql = neon(connectionString);
  // Drizzle instance for schema management
  db = drizzle(sql, { schema });
}

export { sql, db };

