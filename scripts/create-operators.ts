import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const OPERATORS = [
  "Emma", "Noelis", "Rafael", "Sandra", "Yuleidy",
  "Robert", "Edwin", "Yanina", "Henry", "Estefanía",
  "Eveling", "Irma", "Hellen", "Richard",
];

async function main() {
  console.log("=== CREAR OPERARIOS ===\n");

  let created = 0;
  let skipped = 0;

  for (const name of OPERATORS) {
    const existing = await prisma.operator.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      console.log(`  ↑ ${name} (ya existe)`);
      skipped++;
    } else {
      await prisma.operator.create({ data: { id: randomUUID(), name } });
      console.log(`  ✓ ${name}`);
      created++;
    }
  }

  console.log(`\nResumen: ${created} creados, ${skipped} ya existentes, ${OPERATORS.length} total`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
