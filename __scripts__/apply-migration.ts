import "dotenv/config";
import { readFileSync } from "fs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const fullSql = readFileSync(
    "prisma/migrations/20260722170000_box_inventory_models/migration.sql",
    "utf-8",
  );
  const statements = fullSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  let count = 0;
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt + ";");
      count++;
    } catch (e: unknown) {
      const err = e as Error & { meta?: { cause?: string } };
      console.error(`Statement ${count + 1} failed:`, err?.meta?.cause || err.message);
      throw e;
    }
  }
  console.log(`${count} statements executed successfully`);
  await prisma.$disconnect();
}

main().catch((e) => {
  process.exit(1);
});
