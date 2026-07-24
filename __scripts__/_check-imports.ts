import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const imports = await prisma.import.findMany({
    include: { pallets: { include: { boxes: true } } },
  });
  console.log("Imports found:", imports.length);
  for (const imp of imports) {
    console.log(`  ${imp.code} - ${imp.description}`);
    for (const pal of imp.pallets) {
      console.log(`    Pallet: ${pal.number}`);
      for (const box of pal.boxes) {
        console.log(`      Box: ${box.number}`);
      }
    }
  }
  await prisma.$disconnect();
}

main().catch(console.error);
