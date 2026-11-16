import "dotenv/config";
import { Pool } from "pg";
import { createApp } from "./app.js";
import { MemoryRepository } from "./memoryRepository.js";
import { PostgresRepository } from "./postgresRepository.js";

const port = Number(process.env.PORT ?? 4000);
let pool: Pool | undefined;
let storage: "memory" | "postgres" = "memory";
let repository;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query("SELECT 1");
  storage = "postgres";
  repository = new PostgresRepository(pool);
} else {
  repository = new MemoryRepository();
}

const app = createApp({ repository, storage });
const server = app.listen(port, () => {
  console.log(`Lebenslauf-Audit API listening on http://localhost:${port} (${storage})`);
});

async function shutdown() {
  server.close();
  await pool?.end();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

export { app };
