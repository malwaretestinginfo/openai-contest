import { Pool } from "pg";

let pool: Pool | null = null;
let schemaReadyPromise: Promise<void> | null = null;

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.database_url || "";
}

function getPool() {
  if (pool) {
    return pool;
  }

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing");
  }

  pool = new Pool({
    connectionString
  });

  return pool;
}

async function ensureSchema() {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        room_id TEXT PRIMARY KEY,
        room_name TEXT NOT NULL,
        password_hash TEXT,
        created_at BIGINT NOT NULL
      );
    `);
  } finally {
    client.release();
  }
}

export async function getDb() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = ensureSchema();
  }
  await schemaReadyPromise;
  return getPool();
}

