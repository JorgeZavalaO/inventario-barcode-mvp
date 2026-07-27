/**
 * Script para pre-cargar la estructura de Importación → Pallet → Caja
 * para sesiones V4.
 *
 * Uso:
 *   pnpm tsx __scripts__/seed-v4-structure.ts <archivo.csv>
 *
 * Lee un CSV con columnas: importacion, pallet, cajas
 * - importacion: código de la importación (ej: IMP-001)
 * - pallet: número del pallet (ej: PAL-01)
 * - cajas: números separados por coma (ej: 1,2,3,5,8)
 *
 * Ejemplo de CSV (sin header):
 *   IMP-001,PAL-01,"1,2,3,5,8"
 *   IMP-001,PAL-02,"1,2,3,4,5,6,7,8,9,10"
 *   IMP-002,PAL-01,"1,2,3"
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const prisma = new PrismaClient();

type Row = {
  importCode: string;
  palletNumber: string;
  boxNumbers: number[];
};

function parseCsv(filePath: string): Row[] {
  const content = readFileSync(resolve(filePath), "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());
  const rows: Row[] = [];

  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 3) {
      console.warn(`Línea ignorada (menos de 3 columnas): ${line}`);
      continue;
    }

    const [importCode, palletNumber, boxesStr] = parts;
    if (!importCode || !palletNumber || !boxesStr) {
      console.warn(`Línea ignorada (campos vacíos): ${line}`);
      continue;
    }

    const boxNumbers = boxesStr
      .split(";")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    if (boxNumbers.length === 0) {
      console.warn(`Línea ignorada (sin cajas válidas): ${line}`);
      continue;
    }

    rows.push({ importCode, palletNumber, boxNumbers });
  }

  return rows;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.log("Uso: pnpm tsx __scripts__/seed-v4-structure.ts <archivo.csv>");
    console.log("");
    console.log("Formato del CSV (sin header):");
    console.log("  importacion,pallet,cajas");
    console.log('  IMP-001,PAL-01,"1,2,3,5,8"');
    console.log('  IMP-001,PAL-02,"1,2,3,4,5,6,7,8,9,10"');
    process.exit(1);
  }

  const rows = parseCsv(csvPath);
  console.log(`Procesando ${rows.length} filas...`);

  let importsCreated = 0;
  const palletsCreated = 0;
  let boxesCreated = 0;

  for (const row of rows) {
    const imp = await prisma.import.upsert({
      where: { code: row.importCode },
      update: {},
      create: { id: randomUUID(), code: row.importCode, description: row.importCode },
    });
    if (!imp.createdAt.toISOString().startsWith(new Date().toISOString().slice(0, 10))) {
      // import already existed
    } else {
      importsCreated++;
    }

    const pallet = await prisma.pallet.upsert({
      where: { importId_number: { importId: imp.id, number: row.palletNumber } },
      update: {},
      create: { id: randomUUID(), importId: imp.id, number: row.palletNumber },
    });

    for (const boxNum of row.boxNumbers) {
      const boxNumber = String(boxNum);
      const existing = await prisma.box.findUnique({
        where: { palletId_number: { palletId: pallet.id, number: boxNumber } },
      });
      if (!existing) {
        await prisma.box.create({
          data: { id: randomUUID(), palletId: pallet.id, number: boxNumber },
        });
        boxesCreated++;
      }
    }

    process.stdout.write(`  ${row.importCode}/${row.palletNumber}: cajas [${row.boxNumbers.join(",")}] ✓\n`);
  }

  console.log("");
  console.log("Resumen:");
  console.log(`  Importaciones creadas: ${importsCreated}`);
  console.log(`  Pallets creados: ${palletsCreated}`);
  console.log(`  Cajas creadas: ${boxesCreated}`);
  console.log("Listo.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
