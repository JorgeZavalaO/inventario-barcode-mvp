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
      // Connectivity check — schema is managed exclusively by Prisma Migrate
      await sql`SELECT 1 AS ok`;
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}
