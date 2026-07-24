import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireAuth } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const boxItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().max(999999),
  notes: z.string().max(500).optional(),
});

const boxCountSchema = z.object({
  operationId: z.string().uuid(),
  inputMethod: z.enum(["CAMERA", "MANUAL", "USB"]).default("MANUAL"),
  boxIdentity: z.object({
    importCode: z.string().trim().min(1),
    palletNumber: z.string().trim().optional(),
    boxNumber: z.string().trim().min(1),
  }),
  items: z.array(boxItemSchema).min(1).max(3),
}).strict();

async function resolveBoxWithOptionalPallet(tx: any, importCode: string, palletNumber: string | undefined, boxNumber: string) {
  const imp = await tx.import.findUnique({ where: { code: importCode } });
  if (!imp) throw new Error(`Importación ${importCode} no encontrada`);

  let pallet: any = null;
  if (palletNumber) {
    pallet = await tx.pallet.findUnique({ where: { importId_number: { importId: imp.id, number: palletNumber } } });
    if (!pallet) throw new Error(`Pallet ${palletNumber} no encontrado`);
  } else {
    const allPallets = await tx.pallet.findMany({ where: { importId: imp.id, active: true } });
    for (const p of allPallets) {
      const foundBox = await tx.box.findUnique({ where: { palletId_number: { palletId: p.id, number: boxNumber } } });
      if (foundBox) { pallet = p; break; }
    }
  }

  if (!pallet) throw new Error("Pallet no encontrado");
  const box = await tx.box.findUnique({ where: { palletId_number: { palletId: pallet.id, number: boxNumber } } });
  if (!box) throw new Error(`Caja ${boxNumber} no encontrada`);

  return { imp, pallet, box };
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return auth.response;
    const userId = auth.session!.user.id;
    const { id: sessionId } = await context.params;

    const raw = await request.json();
    const body = boxCountSchema.parse(raw);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.countEvent.findUnique({ where: { operationId: body.operationId } });
      if (existing) return { duplicate: true, eventId: existing.id };

      const session = await tx.inventorySession.findUnique({ where: { id: sessionId } });
      if (!session) throw new Error("Sesión no existe");
      if (session.status !== "OPEN") throw new Error("Sesión no está abierta");

      const { imp, pallet, box } = await resolveBoxWithOptionalPallet(tx, body.boxIdentity.importCode, body.boxIdentity.palletNumber, body.boxIdentity.boxNumber);

      const boxProducts = await tx.boxProduct.findMany({
        where: { boxId: box.id, active: true, productId: { in: body.items.map((item) => item.productId) } },
      });
      if (boxProducts.length !== body.items.length) throw new Error("Uno o más productos no pertenecen a esta caja");

      let sessionPosition = await tx.sessionPosition.findFirst({
        where: { sessionId, positionId: box.expectedPositionId ?? undefined },
      });

      let round;

      if (sessionPosition) {
        round = await tx.countRound.findFirst({
          where: { sessionPositionId: sessionPosition.id, status: "OPEN" },
        });

        if (!round) {
          const existingRounds = await tx.countRound.count({ where: { sessionPositionId: sessionPosition.id } });
          round = await tx.countRound.create({
            data: {
              id: randomUUID(),
              sessionPositionId: sessionPosition.id,
              roundNumber: existingRounds + 1,
              operatorId: userId,
              status: "OPEN",
            },
          });
        }

        if (sessionPosition.status === "PENDING" || sessionPosition.status === "ASSIGNED") {
          await tx.sessionPosition.update({
            where: { id: sessionPosition.id },
            data: { status: "IN_PROGRESS", assignedToId: userId, startedAt: new Date() },
          });
        }
      } else {
        const virtualPosition = await tx.storagePosition.findFirst({
          where: { code: "VIRTUAL-V3" },
        });

        let positionId: string;
        if (virtualPosition) {
          positionId = virtualPosition.id;
        } else {
          const rack = await tx.rack.findFirst({ where: { active: true } });
          if (!rack) throw new Error("No hay racks disponibles");

          const compartment = await tx.rackCompartment.findFirst({ where: { rackId: rack.id, active: true } });
          if (!compartment) throw new Error("No hay compartimentos disponibles");

          const depthSlot = await tx.rackDepthSlot.findFirst({ where: { compartmentId: compartment.id, active: true } });
          if (!depthSlot) throw new Error("No hay depth slots disponibles");

          const newPosition = await tx.storagePosition.create({
            data: {
              id: randomUUID(),
              rackId: rack.id,
              compartmentId: compartment.id,
              depthSlotId: depthSlot.id,
              columnIndex: 0,
              stackIndex: 0,
              code: "VIRTUAL-V3",
              qrValue: `LOC:v3:virtual:${randomUUID()}`,
              active: true,
              countable: false,
            },
          });
          positionId = newPosition.id;
        }

        sessionPosition = await tx.sessionPosition.create({
          data: {
            id: randomUUID(),
            sessionId,
            positionId,
            status: "IN_PROGRESS",
            assignedToId: userId,
            startedAt: new Date(),
          },
        });

        const existingRounds = await tx.countRound.count({ where: { sessionPositionId: sessionPosition.id } });
        round = await tx.countRound.create({
          data: {
            id: randomUUID(),
            sessionPositionId: sessionPosition.id,
            roundNumber: existingRounds + 1,
            operatorId: userId,
            status: "OPEN",
          },
        });
      }

      const existingEntry = await tx.boxCountEntry.findUnique({ where: { countRoundId_boxId: { countRoundId: round.id, boxId: box.id } } });
      if (existingEntry) throw new Error("Esta caja ya fue contada en esta ronda");

      const entryId = randomUUID();
      await tx.boxCountEntry.create({
        data: {
          id: entryId, sessionId, countRoundId: round.id, boxId: box.id,
          positionId: sessionPosition.positionId, operatorId: userId,
        },
      });

      const eventIds: string[] = [];
      for (const item of body.items) {
        const eventId = randomUUID();
        eventIds.push(eventId);
        await tx.countEvent.create({
          data: {
            id: eventId, operationId: `${body.operationId}-${item.productId}`,
            sessionId, positionId: sessionPosition.positionId, countRoundId: round.id,
            productId: item.productId, operatorId: userId, quantity: item.quantity,
            inputMethod: body.inputMethod, boxCountEntryId: entryId,
            notes: item.notes ?? null,
          },
        });
      }

      return { boxCountEntryId: entryId, eventIds, itemCount: body.items.length };
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
