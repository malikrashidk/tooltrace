import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Raw SQL client for queries (workaround for Drizzle query builder issues)
export const sql = neon(connectionString);

// Drizzle instance for schema management
export const db = drizzle(sql, { schema });
