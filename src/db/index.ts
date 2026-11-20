import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Fallback to dummy connection string during static page collection / build time
const connectionString =
  process.env.DATABASE_URL || "postgresql://dummy:dummy@ep-dummy.us-east-2.aws.neon.tech/dummy?sslmode=require";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });

export type DB = typeof db;
