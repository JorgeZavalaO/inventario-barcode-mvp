import postgres from "postgres";

let client: ReturnType<typeof postgres> | null = null;
let initPromise: Promise<void> | null = null;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL no está configurado. Copia .env.example a .env y configura PostgreSQL.",
    );
  }

  if (!client) {
    client = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false,
      ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
        ? false
        : "require",
    });
  }

  return client;
}

export async function ensureDatabase() {
  if (!initPromise) {
    initPromise = (async () => {
      const sql = getDb();

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          barcode TEXT UNIQUE,
          description TEXT NOT NULL,
          unit TEXT NOT NULL DEFAULT 'UND',
          category TEXT,
          theoretical_stock NUMERIC(14,3) NOT NULL DEFAULT 0,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS operators (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await sql.unsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS operators_name_lower_idx ON operators (LOWER(name))`,
      );

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS inventory_sessions (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          warehouse TEXT NOT NULL DEFAULT 'Almacén principal',
          status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','PAUSED','CLOSED')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          closed_at TIMESTAMPTZ
        )
      `);

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS session_products (
          session_id TEXT NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
          product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
          theoretical_stock NUMERIC(14,3) NOT NULL DEFAULT 0,
          PRIMARY KEY (session_id, product_id)
        )
      `);

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS session_participants (
          session_id TEXT NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
          operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE RESTRICT,
          joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (session_id, operator_id)
        )
      `);

      await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS count_events (
          id TEXT PRIMARY KEY,
          operation_id TEXT NOT NULL UNIQUE,
          session_id TEXT NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
          product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
          operator_id TEXT NOT NULL REFERENCES operators(id) ON DELETE RESTRICT,
          quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
          input_method TEXT NOT NULL DEFAULT 'CAMERA' CHECK (input_method IN ('CAMERA','MANUAL','USB')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          reversed_at TIMESTAMPTZ
        )
      `);

      await sql.unsafe(
        `CREATE INDEX IF NOT EXISTS count_events_session_product_idx ON count_events(session_id, product_id)`,
      );
      await sql.unsafe(
        `CREATE INDEX IF NOT EXISTS count_events_session_created_idx ON count_events(session_id, created_at DESC)`,
      );
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}
