import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const sessions = await prisma.inventorySession.findMany({
    where: { schemaVersion: 2 },
    include: { _count: { select: { sessionPositions: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  console.log("Sessions found:", sessions.length);
  for (const s of sessions) {
    console.log(`  ${s.code} - ${s.name} - Status: ${s.status} - Positions: ${s._count.sessionPositions}`);
  }
  await prisma.$disconnect();
}

main().catch(console.error);
