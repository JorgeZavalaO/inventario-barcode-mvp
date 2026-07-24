import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import { productImportSchema, validateProductImport } from "@/server/product-import-validation";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;

    const { products } = productImportSchema.parse(await request.json());
    const validation = await validateProductImport(products);
    if (!validation.valid) {
      return NextResponse.json({ error: "La carga contiene conflictos", validation }, { status: 400 });
    }
    let imported = 0;
    const errors: string[] = [];
    const createdBoxes = { imports: 0, pallets: 0, boxes: 0, links: 0 };

    const seenImports = new Set<string>();
    const seenPallets = new Set<string>();
    const seenBoxes = new Set<string>();

    for (const [index, product] of products.entries()) {
      try {
        const existingProduct = await prisma.product.findUnique({ where: { code: product.code } });
        await prisma.product.upsert({
          where: { code: product.code },
          update: {
            barcode: product.barcode || null,
            description: product.description,
            unit: product.unit || "UND",
            category: product.category || null,
            supplierCode: existingProduct?.supplierCode ?? product.supplierCode ?? null,
            theoreticalStock: product.theoreticalStock ?? 0,
            active: true,
          },
          create: {
            id: randomUUID(),
            code: product.code,
            barcode: product.barcode || null,
            description: product.description,
            unit: product.unit || "UND",
            category: product.category || null,
            supplierCode: product.supplierCode || null,
            theoreticalStock: product.theoreticalStock ?? 0,
          },
        });
        imported += 1;

        if (product.importCode && product.boxNumber) {
          const importCode = product.importCode.trim();
          const palletNumber = product.palletNumber?.trim() || "SIN_PALLET";
          const boxNumber = product.boxNumber.trim();

          const importKey = importCode.toUpperCase();
          if (!seenImports.has(importKey)) {
            await prisma.import.upsert({
              where: { code: importCode },
              update: {},
              create: { id: randomUUID(), code: importCode, description: importCode },
            });
            seenImports.add(importKey);
            createdBoxes.imports++;
          }

          const imp = await prisma.import.findUnique({ where: { code: importCode } });
          if (imp) {
            const palletKey = `${importKey}::${palletNumber}`;
            if (!seenPallets.has(palletKey)) {
              await prisma.pallet.upsert({
                where: { importId_number: { importId: imp.id, number: palletNumber } },
                update: {},
                create: { id: randomUUID(), importId: imp.id, number: palletNumber },
              });
              seenPallets.add(palletKey);
              createdBoxes.pallets++;
            }

            const pallet = await prisma.pallet.findUnique({
              where: { importId_number: { importId: imp.id, number: palletNumber } },
            });
            if (pallet) {
              const boxKey = `${palletKey}::${boxNumber}`;
              if (!seenBoxes.has(boxKey)) {
                await prisma.box.upsert({
                  where: { palletId_number: { palletId: pallet.id, number: boxNumber } },
                  update: {},
                  create: { id: randomUUID(), palletId: pallet.id, number: boxNumber },
                });
                seenBoxes.add(boxKey);
                createdBoxes.boxes++;
              }

              const box = await prisma.box.findUnique({
                where: { palletId_number: { palletId: pallet.id, number: boxNumber } },
              });
              const productRecord = await prisma.product.findUnique({ where: { code: product.code } });
              if (box && productRecord) {
                const existingLink = await prisma.boxProduct.findUnique({
                  where: { boxId_productId: { boxId: box.id, productId: productRecord.id } },
                });
                const existingLinks = await prisma.boxProduct.count({ where: { boxId: box.id } });
                if (existingLink || existingLinks < 10) {
                  await prisma.boxProduct.upsert({
                    where: { boxId_productId: { boxId: box.id, productId: productRecord.id } },
                     update: { expectedQty: product.expectedQty ?? null, supplierCode: product.supplierCode || null },
                    create: {
                      id: randomUUID(),
                      boxId: box.id,
                      productId: productRecord.id,
                      orderIndex: existingLinks,
                       expectedQty: product.expectedQty ?? null,
                       supplierCode: product.supplierCode || null,
                    },
                  });
                  createdBoxes.links++;
                }
              }
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        errors.push(`Fila ${index + 2} (${product.code}): ${message}`);
      }
    }

    return NextResponse.json({ imported, errors, boxes: createdBoxes });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return apiError(error);
  }
}
