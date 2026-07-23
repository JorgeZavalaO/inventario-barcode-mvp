import "dotenv/config";
import { prisma } from "../src/lib/prisma";

function generatePhysicalPositionCode(
  rackCode: string,
  compartmentCode: string,
  depthCode: string,
  columnIndex: number,
  stackIndex: number,
): string {
  return `${rackCode}-${compartmentCode}-C${String(columnIndex).padStart(2, "0")}-F${String(stackIndex).padStart(2, "0")}-${depthCode}`;
}

async function main() {
  // 1. Normalize depth slot codes
  const depthSlots = await prisma.rackDepthSlot.findMany();
  let depthUpdated = 0;
  for (const slot of depthSlots) {
    let newCode = slot.code;
    if (slot.code.startsWith("D")) {
      newCode = `P${slot.code.slice(1)}`;
    } else if (!slot.code.startsWith("P")) {
      newCode = `P${String(slot.depthIndex + 1).padStart(2, "0")}`;
    }
    if (newCode !== slot.code) {
      await prisma.rackDepthSlot.update({ where: { id: slot.id }, data: { code: newCode } });
      depthUpdated++;
    }
  }
  console.log(`Depth slots normalizados: ${depthUpdated}`);

  // 2. Rename compartments with hyphens in code (legacy -2 suffix)
  const hyphenComps = await prisma.rackCompartment.findMany({
    where: { code: { contains: "-" } },
    include: { rack: { select: { id: true } } },
    orderBy: [{ rackId: "asc" }, { code: "asc" }],
  });
  let compRenamed = 0;
  for (const comp of hyphenComps) {
    const numericCodes = await prisma.rackCompartment.findMany({
      where: { rackId: comp.rackId },
      select: { code: true },
    });
    const existingNumbers = new Set(
      numericCodes
        .map((c) => {
          const m = c.code.match(/^N(\d+)$/);
          return m ? parseInt(m[1], 10) : null;
        })
        .filter((n): n is number => n !== null),
    );
    let nextNum = 1;
    while (existingNumbers.has(nextNum)) nextNum++;
    const newCode = `N${String(nextNum).padStart(2, "0")}`;
    await prisma.rackCompartment.update({
      where: { id: comp.id },
      data: { code: newCode },
    });
    compRenamed++;
    console.log(`  ${comp.code} → ${newCode} (rack ${comp.rackId.slice(0, 8)})`);
  }
  console.log(`Compartimentos renombrados: ${compRenamed}`);

  // 3. Update compartment codes: C{nn} → N{nn} (any remaining C prefix)
  const cComps = await prisma.rackCompartment.findMany({
    where: { code: { startsWith: "C" } },
  });
  let compUpdated = 0;
  for (const comp of cComps) {
    const newCode = `N${comp.code.slice(1)}`;
    await prisma.rackCompartment.update({ where: { id: comp.id }, data: { code: newCode } });
    compUpdated++;
  }
  console.log(`Compartimentos C→N: ${compUpdated}`);

  // 4. Regenerate all position codes
  const positions = await prisma.storagePosition.findMany({
    where: { active: true },
    include: {
      rack: { select: { code: true } },
      compartment: { select: { code: true } },
      depthSlot: { select: { code: true } },
    },
    orderBy: { code: "asc" },
  });

  console.log(`Total posiciones activas: ${positions.length}`);

  let updated = 0;
  let errors = 0;

  for (const pos of positions) {
    const newCode = generatePhysicalPositionCode(
      pos.rack.code,
      pos.compartment.code,
      pos.depthSlot.code,
      pos.columnIndex,
      pos.stackIndex,
    );

    try {
      await prisma.storagePosition.update({ where: { id: pos.id }, data: { code: newCode } });
      updated++;
    } catch (e: any) {
      console.error(`Error ${pos.id.slice(0, 8)} (${pos.code} → ${newCode}):`, e?.meta?.cause || e.message);
      errors++;
    }
  }

  console.log(`Posiciones actualizadas: ${updated}`);
  if (errors > 0) console.error(`Errores: ${errors}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
