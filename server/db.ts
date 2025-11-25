import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = neon(connectionString);
export const db = drizzle(client);
