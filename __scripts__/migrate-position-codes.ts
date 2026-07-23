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
  // 1. Update depth slot codes: D01..Dnn → P01..Pnn
  const depthSlots = await prisma.rackDepthSlot.findMany({
    where: { code: { startsWith: "D" } },
  });
  let depthUpdated = 0;
  for (const slot of depthSlots) {
    const newCode = `P${slot.code.slice(1)}`;
    await prisma.rackDepthSlot.update({
      where: { id: slot.id },
      data: { code: newCode },
    });
    depthUpdated++;
  }
  console.log(`Depth slots actualizados: ${depthUpdated}`);

  // 2. Update compartment codes: C{nn} → N{nn}
  const compartments = await prisma.rackCompartment.findMany({
    where: { code: { startsWith: "C" } },
  });
  let compUpdated = 0;
  for (const comp of compartments) {
    const newCode = `N${comp.code.slice(1)}`;
    await prisma.rackCompartment.update({
      where: { id: comp.id },
      data: { code: newCode },
    });
    compUpdated++;
  }
  console.log(`Compartimentos actualizados: ${compUpdated}`);

  // 3. Update position codes to new format
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
      await prisma.storagePosition.update({
        where: { id: pos.id },
        data: { code: newCode },
      });
      updated++;
    } catch (e: any) {
      console.error(`Error actualizando ${pos.id} (${pos.code} → ${newCode}):`, e?.meta?.cause || e.message);
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
