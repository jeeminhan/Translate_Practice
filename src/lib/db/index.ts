import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });
export { schema };
