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
  operatorId: z.string().uuid().optional(),
  countedByOperatorId: z.string().uuid().optional(),
  inputMethod: z.enum(["CAMERA", "MANUAL", "USB"]).default("MANUAL"),
  boxIdentity: z.object({
    importCode: z.string().trim().min(1),
    palletNumber: z.string().trim().optional(),
    boxNumber: z.string().trim().min(1),
  }),
  items: z.array(boxItemSchema).min(1).max(5),
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

function virtualColumnIndex(boxId: string) {
  let hash = 0;
  for (const character of boxId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return 100000 + (hash % 900000);
}

async function ensureVirtualLocation(tx: any) {
  const warehouse = await tx.warehouse.upsert({
    where: { code: "VIRTUAL-V3" },
    update: { active: false },
    create: { id: randomUUID(), code: "VIRTUAL-V3", name: "Registros virtuales V3", active: false },
  });
  const floor = await tx.floor.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: "V3" } },
    update: { active: false },
    create: { id: randomUUID(), warehouseId: warehouse.id, code: "V3", name: "Sesiones V3", orderIndex: 0, active: false },
  });
  const zone = await tx.warehouseZone.upsert({
    where: { floorId_code: { floorId: floor.id, code: "VIRTUAL" } },
    update: { active: false },
    create: { id: randomUUID(), floorId: floor.id, code: "VIRTUAL", name: "Registros sin ubicación", orderIndex: 0, active: false },
  });
  const rack = await tx.rack.upsert({
    where: { zoneId_code: { zoneId: zone.id, code: "V3" } },
    update: { active: false },
    create: { id: randomUUID(), zoneId: zone.id, code: "V3", name: "Contenedores virtuales V3", orderIndex: 0, active: false },
  });
  const compartment = await tx.rackCompartment.upsert({
    where: { rackId_code: { rackId: rack.id, code: "VIRTUAL" } },
    update: { active: false },
    create: {
      id: randomUUID(), rackId: rack.id, code: "VIRTUAL", name: "Contenedores V3",
      x: 0, y: 0, width: 10000, height: 10000, columnCount: 1, stackLevels: 1, orderIndex: 0, active: false,
    },
  });
  const depthSlot = await tx.rackDepthSlot.upsert({
    where: { compartmentId_code: { compartmentId: compartment.id, code: "VIRTUAL" } },
    update: { active: false },
    create: {
      id: randomUUID(), compartmentId: compartment.id, code: "VIRTUAL", name: "Registro virtual",
      kind: "CUSTOM", depthIndex: 0, active: false,
    },
  });
  return { rack, compartment, depthSlot };
}

async function ensureSessionPositionForBox(tx: any, sessionId: string, box: any, userId: string) {
  const code = `VIRTUAL-V3-${box.id}`;
  let position = await tx.storagePosition.findFirst({ where: { code } });

  if (!position) {
    let rack = await tx.rack.findFirst({ where: { active: true } });
    let compartment = rack
      ? await tx.rackCompartment.findFirst({ where: { rackId: rack.id, active: true } })
      : null;
    let depthSlot = compartment
      ? await tx.rackDepthSlot.findFirst({ where: { compartmentId: compartment.id, active: true } })
      : null;

    if (!rack || !compartment || !depthSlot) {
      const virtualLocation = await ensureVirtualLocation(tx);
      rack = virtualLocation.rack;
      compartment = virtualLocation.compartment;
      depthSlot = virtualLocation.depthSlot;
    }

    position = await tx.storagePosition.create({
      data: {
        id: randomUUID(),
        rackId: rack.id,
        compartmentId: compartment.id,
        depthSlotId: depthSlot.id,
        columnIndex: virtualColumnIndex(box.id),
        stackIndex: 0,
        code,
        qrValue: `LOC:v3:virtual:${box.id}`,
        active: false,
        countable: false,
      },
    });
  }

  let sessionPosition = await tx.sessionPosition.findUnique({
    where: { sessionId_positionId: { sessionId, positionId: position.id } },
  });

  if (!sessionPosition) {
    sessionPosition = await tx.sessionPosition.create({
      data: {
        id: randomUUID(),
        sessionId,
        positionId: position.id,
        status: "IN_PROGRESS",
        assignedToId: userId,
        startedAt: new Date(),
      },
    });
  }

  return sessionPosition;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return auth.response;
    const { id: sessionId } = await context.params;

    const raw = await request.json();
    const body = boxCountSchema.parse(raw);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.countEvent.findFirst({
        where: { sessionId, operationId: { startsWith: `${body.operationId}-` } },
      });
      if (existing) return { duplicate: true, eventId: existing.id };

      const session = await tx.inventorySession.findUnique({ where: { id: sessionId } });
      if (!session) throw new Error("Sesión no existe");
      if (session.status !== "OPEN" && session.status !== "REVIEW") {
        throw new Error("Sesión no está disponible para conteos");
      }

       const operatorId = body.operatorId ?? auth.session!.user.id;
       const operator = await tx.operator.findUnique({ where: { id: operatorId } });
       if (!operator) throw new Error("Digitador no identificado. Ingresa nuevamente a la sesión.");

       const countedByOperatorId = body.countedByOperatorId ?? operatorId;
       if (body.countedByOperatorId && countedByOperatorId === operatorId) {
         throw new Error("El operario contador debe ser diferente del digitador.");
       }
       const countedByOperator = await tx.operator.findUnique({ where: { id: countedByOperatorId } });
       if (!countedByOperator) throw new Error("Operario contador no identificado.");

       await tx.sessionParticipant.upsert({
         where: { sessionId_operatorId: { sessionId, operatorId } },
         update: { lastSeenAt: new Date() },
         create: { sessionId, operatorId },
       });
       await tx.sessionParticipant.upsert({
         where: { sessionId_operatorId: { sessionId, operatorId: countedByOperatorId } },
         update: { lastSeenAt: new Date() },
         create: { sessionId, operatorId: countedByOperatorId },
       });

      const { imp, pallet, box } = await resolveBoxWithOptionalPallet(tx, body.boxIdentity.importCode, body.boxIdentity.palletNumber, body.boxIdentity.boxNumber);

      const itemProductIds = [...new Set(body.items.map((item) => item.productId))];
      const boxProducts = await tx.boxProduct.findMany({
        where: { boxId: box.id, active: true, productId: { in: itemProductIds } },
      });
      if (boxProducts.length !== itemProductIds.length) throw new Error("Uno o más productos no pertenecen a esta caja");

      const sessionPosition = await ensureSessionPositionForBox(tx, sessionId, box, operatorId);
      if (sessionPosition.status === "APPROVED" || sessionPosition.status === "EXCLUDED") {
        throw new Error("Esta caja ya fue aprobada y no requiere otro conteo");
      }

      let round = await tx.countRound.findFirst({
        where: { sessionPositionId: sessionPosition.id, status: "OPEN" },
      });

      if (!round) {
        const latestRound = await tx.countRound.findFirst({
          where: { sessionPositionId: sessionPosition.id },
          orderBy: { roundNumber: "desc" },
        });
        if (latestRound?.status === "APPROVED") throw new Error("Esta caja ya fue aprobada y no requiere otro conteo");
        round = await tx.countRound.create({
          data: {
            id: randomUUID(),
            sessionPositionId: sessionPosition.id,
            roundNumber: (latestRound?.roundNumber ?? 0) + 1,
            operatorId,
            status: "OPEN",
          },
        });
      }

      if (sessionPosition.status !== "IN_PROGRESS") {
        await tx.sessionPosition.update({
          where: { id: sessionPosition.id },
          data: { status: "IN_PROGRESS", assignedToId: operatorId, startedAt: new Date() },
        });
      }

      const existingEntry = await tx.boxCountEntry.findUnique({ where: { countRoundId_boxId: { countRoundId: round.id, boxId: box.id } } });
      if (existingEntry) throw new Error("Esta caja ya fue contada en esta ronda");

      const entryId = randomUUID();
      await tx.boxCountEntry.create({
        data: {
           id: entryId, sessionId, countRoundId: round.id, boxId: box.id,
           positionId: sessionPosition.positionId, operatorId, countedByOperatorId,
        },
      });

      const eventIds: string[] = [];
      for (const [index, item] of body.items.entries()) {
        const eventId = randomUUID();
        eventIds.push(eventId);
        await tx.countEvent.create({
          data: {
            id: eventId, operationId: `${body.operationId}-${index}`,
            sessionId, positionId: sessionPosition.positionId, countRoundId: round.id,
             productId: item.productId, operatorId, quantity: item.quantity,
             countedByOperatorId,
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
    if (error instanceof Error && /Sesión|Posición|Ronda|Producto|Importación|Pallet|Caja|Operador|Digitador|contador|productos no pertenecen|ya fue contada|aprobada/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
}
