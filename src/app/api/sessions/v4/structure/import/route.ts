import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

function parseBoxRange(input: string): number[] {
  if (!input.trim()) return [];
  const parts = input.split(",");
  const result: number[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);
      if (isNaN(start) || isNaN(end) || start < 1 || end < start) continue;
      for (let i = start; i <= end; i++) result.push(i);
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1) result.push(num);
    }
  }
  return [...new Set(result)].sort((a, b) => a - b);
}

const rowSchema = z.object({
  importCode: z.string().trim().min(1).max(100),
  palletNumber: z.string().trim().min(1).max(30),
  boxNumbers: z.array(z.number().int().min(1)).min(1),
}).strict();

const importSchema = z.object({
  rows: z.array(rowSchema).min(1).max(5000),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;

    const { rows } = importSchema.parse(await request.json());

    const created = { imports: 0, pallets: 0, boxes: 0 };
    const errors: string[] = [];
    const seenImports = new Set<string>();
    const seenPallets = new Set<string>();
    const seenBoxes = new Set<string>();

    for (const [index, row] of rows.entries()) {
      try {
        const line = index + 1;

        const impKey = row.importCode.trim().toUpperCase();
        if (!seenImports.has(impKey)) {
          await prisma.import.upsert({
            where: { code: row.importCode.trim() },
            update: {},
            create: { id: randomUUID(), code: row.importCode.trim(), description: row.importCode.trim() },
          });
          seenImports.add(impKey);
          created.imports++;
        }

        const imp = await prisma.import.findUnique({ where: { code: row.importCode.trim() } });
        if (!imp) {
          errors.push(`Línea ${line}: importación ${row.importCode} no encontrada`);
          continue;
        }

        const palletKey = `${impKey}::${row.palletNumber.trim().toUpperCase()}`;
        if (!seenPallets.has(palletKey)) {
          await prisma.pallet.upsert({
            where: { importId_number: { importId: imp.id, number: row.palletNumber.trim() } },
            update: {},
            create: { id: randomUUID(), importId: imp.id, number: row.palletNumber.trim() },
          });
          seenPallets.add(palletKey);
          created.pallets++;
        }

        const pallet = await prisma.pallet.findUnique({
          where: { importId_number: { importId: imp.id, number: row.palletNumber.trim() } },
        });
        if (!pallet) {
          errors.push(`Línea ${line}: pallet ${row.palletNumber} no encontrado`);
          continue;
        }

        for (const boxNum of row.boxNumbers) {
          const boxNumber = String(boxNum);
          const boxKey = `${palletKey}::${boxNumber}`;
          if (!seenBoxes.has(boxKey)) {
            const existing = await prisma.box.findUnique({
              where: { palletId_number: { palletId: pallet.id, number: boxNumber } },
            });
            if (!existing) {
              await prisma.box.create({
                data: { id: randomUUID(), palletId: pallet.id, number: boxNumber },
              });
            }
            seenBoxes.add(boxKey);
            created.boxes++;
          }
        }
      } catch (error) {
        errors.push(`Línea ${index + 1}: ${error instanceof Error ? error.message : "Error desconocido"}`);
      }
    }

    return NextResponse.json({ created, errors, total: rows.length });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
