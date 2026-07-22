import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const rowSchema = z.object({
  importCode: z.string().trim().min(1).max(100),
  palletNumber: z.string().trim().min(1).max(30),
  boxNumber: z.string().trim().min(1).max(30),
  productCode: z.string().trim().min(1).max(80),
  productDescription: z.string().trim().min(1).max(240).optional(),
  productUnit: z.string().trim().max(20).optional(),
  productCategory: z.string().trim().max(100).optional(),
  expectedQty: z.coerce.number().min(0).optional(),
  expectedPosition: z.string().trim().max(60).optional(),
});

const importSchema = z.object({
  rows: z.array(rowSchema).min(1).max(10000),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const { rows } = importSchema.parse(await request.json());

    const errors: string[] = [];
    const created = { imports: 0, pallets: 0, boxes: 0, products: 0, links: 0 };
    const seen = { imports: new Set<string>(), pallets: new Set<string>(), boxes: new Set<string>(), products: new Set<string>() };

    for (const [index, row] of rows.entries()) {
      try {
        const line = index + 1;
        const { importCode, palletNumber, boxNumber, productCode, productDescription, productUnit, productCategory, expectedQty, expectedPosition } = row;

        const impKey = importCode.trim().toUpperCase();
        if (!seen.imports.has(impKey)) {
          await prisma.import.upsert({ where: { code: importCode.trim() }, update: {}, create: { id: randomUUID(), code: importCode.trim(), description: importCode.trim() } });
          seen.imports.add(impKey);
          created.imports++;
        }

        const palletKey = `${impKey}::${palletNumber.trim()}`;
        if (!seen.pallets.has(palletKey)) {
          const imp = await prisma.import.findUnique({ where: { code: importCode.trim() } });
          if (imp) {
            await prisma.pallet.upsert({ where: { importId_number: { importId: imp.id, number: palletNumber.trim() } }, update: {}, create: { id: randomUUID(), importId: imp.id, number: palletNumber.trim() } });
          }
          seen.pallets.add(palletKey);
          created.pallets++;
        }

        const boxKey = `${palletKey}::${boxNumber.trim()}`;
        if (!seen.boxes.has(boxKey)) {
          const imp = await prisma.import.findUnique({ where: { code: importCode.trim() } });
          if (imp) {
            const pallet = await prisma.pallet.findUnique({ where: { importId_number: { importId: imp.id, number: palletNumber.trim() } } });
            if (pallet) {
              let expectedPositionId: string | undefined;
              if (expectedPosition) {
                const pos = await prisma.storagePosition.findUnique({ where: { code: expectedPosition.trim() } });
                if (!pos) {
                  errors.push(`Línea ${line}: posición esperada ${expectedPosition} no encontrada`);
                } else {
                  expectedPositionId = pos.id;
                }
              }
              await prisma.box.upsert({
                where: { palletId_number: { palletId: pallet.id, number: boxNumber.trim() } },
                update: { expectedPositionId: expectedPositionId ?? undefined },
                create: { id: randomUUID(), palletId: pallet.id, number: boxNumber.trim(), expectedPositionId },
              });
            }
          }
          seen.boxes.add(boxKey);
          created.boxes++;
        }

        const productKey = productCode.trim().toUpperCase();
        if (!seen.products.has(productKey)) {
          await prisma.product.upsert({
            where: { code: productCode.trim() },
            update: {},
            create: { id: randomUUID(), code: productCode.trim(), description: productDescription || productCode.trim(), unit: productUnit || "UND", category: productCategory || null },
          });
          seen.products.add(productKey);
          created.products++;
        }

        const imp = await prisma.import.findUnique({ where: { code: importCode.trim() } });
        if (!imp) { errors.push(`Línea ${line}: importación no encontrada`); continue; }
        const pallet = await prisma.pallet.findUnique({ where: { importId_number: { importId: imp.id, number: palletNumber.trim() } } });
        if (!pallet) { errors.push(`Línea ${line}: pallet no encontrado`); continue; }
        const box = await prisma.box.findUnique({ where: { palletId_number: { palletId: pallet.id, number: boxNumber.trim() } } });
        if (!box) { errors.push(`Línea ${line}: caja no encontrada`); continue; }
        const product = await prisma.product.findUnique({ where: { code: productCode.trim() } });
        if (!product) { errors.push(`Línea ${line}: producto no encontrado`); continue; }

        const existingLinks = await prisma.boxProduct.count({ where: { boxId: box.id } });
        if (existingLinks >= 3) {
          errors.push(`Línea ${line}: la caja ${importCode}/${palletNumber}/${boxNumber} ya tiene 3 productos`);
          continue;
        }

        await prisma.boxProduct.upsert({
          where: { boxId_productId: { boxId: box.id, productId: product.id } },
          update: { expectedQty: expectedQty ?? null, orderIndex: existingLinks },
          create: { id: randomUUID(), boxId: box.id, productId: product.id, orderIndex: existingLinks, expectedQty: expectedQty ?? null },
        });
        created.links++;
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
