import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const rowSchema = z.object({
  productCode: z.string().trim().min(1),
  positionCode: z.string().trim().min(1),
  theoreticalStock: z.coerce.number().min(0),
  minimumStock: z.coerce.number().min(0).optional().nullable(),
  isPrimary: z.coerce.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const rows = Array.isArray(body) ? body : body.rows ?? [];

    const results: { row: number; status: string; product?: string; position?: string; error?: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const data = rowSchema.parse(rows[i]);

        const product = await prisma.product.findUnique({ where: { code: data.productCode } });
        if (!product) { results.push({ row: i + 1, status: "error", error: `Producto ${data.productCode} no encontrado` }); continue; }

        const position = await prisma.storagePosition.findFirst({ where: { code: data.positionCode } });
        if (!position) { results.push({ row: i + 1, status: "error", error: `Posición ${data.positionCode} no encontrada` }); continue; }

        await prisma.productLocationStock.upsert({
          where: { productId_positionId: { productId: product.id, positionId: position.id } },
          update: {
            theoreticalStock: data.theoreticalStock,
            minimumStock: data.minimumStock ?? null,
            isPrimary: data.isPrimary ?? false,
            source: "import",
            sourceUpdatedAt: new Date(),
          },
          create: {
            id: randomUUID(),
            productId: product.id,
            positionId: position.id,
            theoreticalStock: data.theoreticalStock,
            minimumStock: data.minimumStock ?? null,
            isPrimary: data.isPrimary ?? false,
            source: "import",
            sourceUpdatedAt: new Date(),
          },
        });

        results.push({ row: i + 1, status: "ok", product: data.productCode, position: data.positionCode });
      } catch (error) {
        const message = error instanceof z.ZodError ? error.issues[0]?.message : String(error);
        results.push({ row: i + 1, status: "error", error: message });
      }
    }

    return NextResponse.json({ results, total: rows.length, ok: results.filter((r) => r.status === "ok").length });
  } catch (error) {
    return apiError(error);
  }
}
