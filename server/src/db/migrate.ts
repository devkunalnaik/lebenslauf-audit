import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for database migrations");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const here = dirname(fileURLToPath(import.meta.url));
try {
  const schema = await readFile(resolve(here, "schema.sql"), "utf8");
  await pool.query(schema);
  console.log("Database migration completed.");
} finally {
  await pool.end();
}
