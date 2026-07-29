// Lazy Drizzle client. No connection is attempted at import time so the rest of
// the pipeline (parser, validation) runs without a live DB.
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

export function createDb(url: string | undefined = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema });
}
