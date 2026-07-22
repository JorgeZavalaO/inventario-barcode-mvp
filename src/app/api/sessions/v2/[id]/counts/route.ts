import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireAuth } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const boxItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive().max(999999),
});

const boxCountSchema = z.object({
  operationId: z.string().uuid(),
  positionId: z.string().uuid(),
  countRoundId: z.string().uuid(),
  inputMethod: z.enum(["CAMERA", "MANUAL", "USB"]).default("MANUAL"),
  boxIdentity: z.object({
    importCode: z.string().trim().min(1),
    palletNumber: z.string().trim().min(1),
    boxNumber: z.string().trim().min(1),
  }),
  items: z.array(boxItemSchema).min(1).max(3),
}).strict();

const legacyCountSchema = z.object({
  operationId: z.string().uuid(),
  positionId: z.string().uuid(),
  countRoundId: z.string().uuid(),
  productCode: z.string().trim().min(1),
  quantity: z.coerce.number().positive().max(999999),
  inputMethod: z.enum(["CAMERA", "MANUAL", "USB"]).default("CAMERA"),
  boxIdentity: z.undefined().optional(),
}).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return auth.response;
    const userId = auth.session!.user.id;
    const { id: sessionId } = await context.params;

    const raw = await request.json();
    const isBoxCount = raw.boxIdentity !== undefined;

    const body = isBoxCount ? boxCountSchema.parse(raw) : legacyCountSchema.parse(raw);

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

      if (isBoxCount) {
        const bc = body as z.infer<typeof boxCountSchema>;
        const imp = await tx.import.findUnique({ where: { code: bc.boxIdentity.importCode } });
        if (!imp) throw new Error(`Importación ${bc.boxIdentity.importCode} no encontrada`);
        const pallet = await tx.pallet.findUnique({ where: { importId_number: { importId: imp.id, number: bc.boxIdentity.palletNumber } } });
        if (!pallet) throw new Error(`Pallet ${bc.boxIdentity.palletNumber} no encontrado`);
        const box = await tx.box.findUnique({ where: { palletId_number: { palletId: pallet.id, number: bc.boxIdentity.boxNumber } } });
        if (!box) throw new Error(`Caja ${bc.boxIdentity.boxNumber} no encontrada`);

        const existingEntry = await tx.boxCountEntry.findUnique({ where: { countRoundId_boxId: { countRoundId: body.countRoundId, boxId: box.id } } });
        if (existingEntry) throw new Error("Esta caja ya fue contada en esta ronda");

        const boxProducts = await tx.boxProduct.findMany({
          where: { boxId: box.id, active: true, productId: { in: bc.items.map((item) => item.productId) } },
        });
        if (boxProducts.length !== bc.items.length) throw new Error("Uno o más productos no pertenecen a esta caja");

        const entryId = randomUUID();
        await tx.boxCountEntry.create({
          data: {
            id: entryId, sessionId, countRoundId: body.countRoundId, boxId: box.id,
            positionId: body.positionId, operatorId: userId,
          },
        });

        const eventIds: string[] = [];
        for (const item of bc.items) {
          const eventId = randomUUID();
          eventIds.push(eventId);
          await tx.countEvent.create({
            data: {
              id: eventId, operationId: `${body.operationId}-${item.productId}`,
              sessionId, positionId: body.positionId, countRoundId: body.countRoundId,
              productId: item.productId, operatorId: userId, quantity: item.quantity,
              inputMethod: body.inputMethod, boxCountEntryId: entryId,
            },
          });
        }

        return { boxCountEntryId: entryId, eventIds, itemCount: bc.items.length };
      } else {
        const lc = body as z.infer<typeof legacyCountSchema>;
        const product = await tx.product.findFirst({
          where: { active: true, OR: [{ barcode: lc.productCode }, { code: lc.productCode }] },
        });
        if (!product) throw new Error(`Producto ${lc.productCode} no encontrado`);

        const eventId = randomUUID();
        await tx.countEvent.create({
          data: {
            id: eventId, operationId: lc.operationId, sessionId,
            positionId: lc.positionId, countRoundId: lc.countRoundId,
            productId: product.id, operatorId: userId, quantity: lc.quantity,
            inputMethod: lc.inputMethod,
          },
        });

        return { eventId, product: { id: product.id, code: product.code, description: product.description } };
      }
    });

    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    if (error instanceof Error && /Sesión|Posición|Ronda|Producto|Importación|Pallet|Caja|productos no pertenecen|ya fue contada/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
}
