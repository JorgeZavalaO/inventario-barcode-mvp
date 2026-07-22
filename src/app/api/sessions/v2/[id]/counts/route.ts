import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireAuth } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const countSchema = z.object({
  operationId: z.string().uuid(),
  positionId: z.string().uuid(),
  countRoundId: z.string().uuid(),
  productCode: z.string().trim().min(1),
  packageCount: z.coerce.number().int().min(0).optional(),
  unitsPerPackage: z.coerce.number().min(0).optional(),
  looseQuantity: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().positive().max(999999),
  inputMethod: z.enum(["CAMERA", "MANUAL", "USB"]).default("CAMERA"),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return auth.response;
    const userId = auth.session!.user.id;

    const { id: sessionId } = await context.params;
    const body = countSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.countEvent.findUnique({ where: { operationId: body.operationId } });
      if (existing) return { duplicate: true, eventId: existing.id };

      const session = await tx.inventorySession.findUnique({ where: { id: sessionId } });
      if (!session) throw new Error("Sesión no existe");
      if (session.status !== "OPEN") throw new Error("Sesión no está abierta");

      const sessionPosition = await tx.sessionPosition.findUnique({
        where: { sessionId_positionId: { sessionId, positionId: body.positionId } },
      });
      if (!sessionPosition) throw new Error("Posición no pertenece a la sesión");
      if (sessionPosition.status === "COMPLETED") throw new Error("Posición ya completada");

      const round = await tx.countRound.findUnique({ where: { id: body.countRoundId } });
      if (!round || round.sessionPositionId !== sessionPosition.id) throw new Error("Ronda inválida");
      if (round.status !== "OPEN") throw new Error("Ronda no está abierta");

      const product = await tx.product.findFirst({
        where: { active: true, OR: [{ barcode: body.productCode }, { code: body.productCode }] },
      });
      if (!product) throw new Error(`Producto ${body.productCode} no encontrado`);

      const eventId = randomUUID();
      await tx.countEvent.create({
        data: {
          id: eventId,
          operationId: body.operationId,
          sessionId,
          positionId: body.positionId,
          countRoundId: body.countRoundId,
          productId: product.id,
          operatorId: userId,
          quantity: body.quantity,
          inputMethod: body.inputMethod,
          packageCount: body.packageCount ?? null,
          unitsPerPackage: body.unitsPerPackage ?? null,
          looseQuantity: body.looseQuantity ?? null,
        },
      });

      return { duplicate: false, eventId, product: { id: product.id, code: product.code, description: product.description } };
    });

    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    if (error instanceof Error && /Sesión|Posición|Ronda|Producto/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
}
