import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const countSchema = z.object({
  operationId: z.string().uuid(),
  operatorId: z.string().uuid(),
  code: z.string().trim().min(1).max(120),
  cajas: z.coerce.number().int().min(1).max(999999),
  unidadesPorCaja: z.coerce.number().int().min(1).max(999999),
  notes: z.string().trim().max(500).optional(),
  inputMethod: z.enum(["CAMERA", "MANUAL", "USB"]).default("MANUAL"),
}).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: sessionId } = await context.params;
    const body = countSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.countEvent.findUnique({
        where: { operationId: body.operationId },
        select: { id: true },
      });
      if (duplicate) return { duplicate: true, eventId: duplicate.id };

      const session = await tx.inventorySession.findUnique({ where: { id: sessionId } });
      if (!session || session.schemaVersion !== 5) throw new Error("Sesión V5 no existe");
      if (session.status !== "OPEN") throw new Error("La sesión no está disponible para conteos");

      const operator = await tx.operator.findUnique({ where: { id: body.operatorId } });
      if (!operator) throw new Error("Operador no identificado");

      const product = await tx.product.findFirst({
        where: {
          active: true,
          OR: [
            { code: { equals: body.code, mode: "insensitive" } },
            { barcode: { equals: body.code, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          code: true,
          description: true,
          unit: true,
          theoreticalStock: true,
        },
      });
      if (!product) throw new Error("Producto no encontrado");

      const total = body.cajas * body.unidadesPorCaja;

      await tx.sessionParticipant.upsert({
        where: { sessionId_operatorId: { sessionId, operatorId: operator.id } },
        update: { lastSeenAt: new Date() },
        create: { sessionId, operatorId: operator.id },
      });

      await tx.sessionProduct.upsert({
        where: { sessionId_productId: { sessionId, productId: product.id } },
        update: {},
        create: {
          sessionId,
          productId: product.id,
          theoreticalStock: product.theoreticalStock,
        },
      });

      const event = await tx.countEvent.create({
        data: {
          id: randomUUID(),
          operationId: body.operationId,
          sessionId,
          productId: product.id,
          operatorId: operator.id,
          quantity: total,
          isCorrect: true,
          inputMethod: body.inputMethod,
          packageCount: body.cajas,
          unitsPerPackage: body.unidadesPorCaja,
          notes: body.notes || null,
        },
      });

      return {
        duplicate: false,
        eventId: event.id,
        product: {
          id: product.id,
          code: product.code,
          description: product.description,
          unit: product.unit,
        },
        cajas: body.cajas,
        unidadesPorCaja: body.unidadesPorCaja,
        total,
        notes: body.notes || "",
      };
    });

    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof Error && /Sesión|Operador|Producto|conteos/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
}
