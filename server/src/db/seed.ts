import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed the database");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const here = dirname(fileURLToPath(import.meta.url));
try {
  const seed = await readFile(resolve(here, "seed.sql"), "utf8");
  await pool.query(seed);
  console.log("Database seed completed.");
} finally {
  await pool.end();
}
