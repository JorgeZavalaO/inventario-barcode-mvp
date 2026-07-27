import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const countSchema = z.object({
  operationId: z.string().uuid(),
  operatorId: z.string().uuid(),
  countedByOperatorId: z.string().uuid().optional(),
  importCode: z.string().trim().min(1),
  palletNumber: z.string().trim().optional(),
  boxNumber: z.coerce.string().min(1),
  productId: z.string().uuid(),
  cajas: z.coerce.number().int().min(1).max(9999),
  unidadesPorCaja: z.coerce.number().int().min(1).max(9999),
  notes: z.string().max(500).optional(),
}).strict();

async function ensureVirtualLocation(tx: Prisma.TransactionClient) {
  const warehouse = await tx.warehouse.upsert({
    where: { code: "VIRTUAL-V4" },
    update: { active: false },
    create: { id: randomUUID(), code: "VIRTUAL-V4", name: "Registros virtuales V4", active: false },
  });
  const floor = await tx.floor.upsert({
    where: { warehouseId_code: { warehouseId: warehouse.id, code: "V4" } },
    update: { active: false },
    create: { id: randomUUID(), warehouseId: warehouse.id, code: "V4", name: "Sesiones V4", orderIndex: 0, active: false },
  });
  const zone = await tx.warehouseZone.upsert({
    where: { floorId_code: { floorId: floor.id, code: "VIRTUAL" } },
    update: { active: false },
    create: { id: randomUUID(), floorId: floor.id, code: "VIRTUAL", name: "Registros sin ubicación", orderIndex: 0, active: false },
  });
  const rack = await tx.rack.upsert({
    where: { zoneId_code: { zoneId: zone.id, code: "V4" } },
    update: { active: false },
    create: { id: randomUUID(), zoneId: zone.id, code: "V4", name: "Contenedores virtuales V4", orderIndex: 0, active: false },
  });
  const compartment = await tx.rackCompartment.upsert({
    where: { rackId_code: { rackId: rack.id, code: "VIRTUAL" } },
    update: { active: false },
    create: {
      id: randomUUID(), rackId: rack.id, code: "VIRTUAL", name: "Contenedores V4",
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

function virtualColumnIndex(boxId: string) {
  let hash = 0;
  for (const character of boxId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return 100000 + (hash % 900000);
}

async function ensureSessionPositionForBox(tx: Prisma.TransactionClient, sessionId: string, box: { id: string }, userId: string) {
  const code = `VIRTUAL-V4-${box.id}`;
  let position = await tx.storagePosition.findFirst({ where: { code } });

  if (!position) {
    let rack = await tx.rack.findFirst({ where: { code: "V4", active: false } });
    let compartment = rack ? await tx.rackCompartment.findFirst({ where: { rackId: rack.id, active: false } }) : null;
    let depthSlot = compartment ? await tx.rackDepthSlot.findFirst({ where: { compartmentId: compartment.id, active: false } }) : null;

    if (!rack || !compartment || !depthSlot) {
      const virtualLocation = await ensureVirtualLocation(tx);
      rack = virtualLocation.rack;
      compartment = virtualLocation.compartment;
      depthSlot = virtualLocation.depthSlot;
    }

    let columnIndex = virtualColumnIndex(box.id);
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      try {
        position = await tx.storagePosition.create({
          data: {
            id: randomUUID(),
            rackId: rack!.id,
            compartmentId: compartment!.id,
            depthSlotId: depthSlot!.id,
            columnIndex,
            stackIndex: 0,
            code,
            qrValue: `LOC:v4:virtual:${box.id}`,
            active: false,
            countable: false,
          },
        });
        break;
      } catch (err: unknown) {
        if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
          const existing = await tx.storagePosition.findFirst({ where: { code } });
          if (existing) { position = existing; break; }
          columnIndex = ((columnIndex + 1 - 100000) % 900000) + 100001;
        } else { throw err; }
      }
    }

    if (!position) throw new Error("No se pudo crear la ubicación virtual.");
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
    const { id: sessionId } = await context.params;

    const raw = await request.json();
    const body = countSchema.parse(raw);

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

      const operatorId = body.operatorId;
      if (!operatorId) throw new Error("Digitador no identificado. Ingresa nuevamente a la sesión.");
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

      const product = await tx.product.findUnique({ where: { id: body.productId } });
      if (!product) throw new Error("Producto no encontrado");

      const imp = await tx.import.upsert({
        where: { code: body.importCode.trim() },
        update: {},
        create: { id: randomUUID(), code: body.importCode.trim(), description: body.importCode.trim() },
      });

      let palletId: string | null = null;
      if (body.palletNumber && body.palletNumber.trim()) {
        const pallet = await tx.pallet.upsert({
          where: { importId_number: { importId: imp.id, number: body.palletNumber.trim() } },
          update: {},
          create: { id: randomUUID(), importId: imp.id, number: body.palletNumber.trim() },
        });
        palletId = pallet.id;
      } else {
        const firstPallet = await tx.pallet.findFirst({ where: { importId: imp.id, active: true } });
        palletId = firstPallet?.id ?? null;
        if (!palletId) {
          const newPallet = await tx.pallet.create({
            data: { id: randomUUID(), importId: imp.id, number: "1" },
          });
          palletId = newPallet.id;
        }
      }

      let box = await tx.box.findUnique({
        where: { palletId_number: { palletId: palletId!, number: body.boxNumber } },
      });
      if (!box) {
        box = await tx.box.create({
          data: { id: randomUUID(), palletId: palletId!, number: body.boxNumber },
        });
      }

      const existingLink = await tx.boxProduct.findUnique({
        where: { boxId_productId: { boxId: box.id, productId: body.productId } },
      });
      if (!existingLink) {
        const linkCount = await tx.boxProduct.count({ where: { boxId: box.id } });
        await tx.boxProduct.create({
          data: {
            id: randomUUID(),
            boxId: box.id,
            productId: body.productId,
            orderIndex: linkCount,
            expectedQty: null,
            supplierCode: product.supplierCode,
          },
        });
      }

      const sessionPosition = await ensureSessionPositionForBox(tx, sessionId, box, operatorId);

      let round = await tx.countRound.findFirst({
        where: { sessionPositionId: sessionPosition.id, status: "OPEN" },
      });
      if (!round) {
        const latestRound = await tx.countRound.findFirst({
          where: { sessionPositionId: sessionPosition.id },
          orderBy: { roundNumber: "desc" },
        });
        if (latestRound?.status === "APPROVED") throw new Error("Esta caja ya fue aprobada");
        if (latestRound?.status === "SUBMITTED") throw new Error("Esta caja está en revisión, espera a que sea aprobada o rechazada");
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

      const existingEntry = await tx.boxCountEntry.findUnique({
        where: { countRoundId_boxId: { countRoundId: round.id, boxId: box.id } },
      });
      let entryId: string;

      if (existingEntry) {
        const existingProductEvent = await tx.countEvent.findFirst({
          where: {
            boxCountEntryId: existingEntry.id,
            productId: body.productId,
            reversedAt: null,
          },
        });
        if (existingProductEvent) {
          throw new Error("Producto ya contado en esta caja en esta ronda");
        }
        entryId = existingEntry.id;
      } else {
        entryId = randomUUID();
        await tx.boxCountEntry.create({
          data: {
            id: entryId,
            sessionId,
            countRoundId: round.id,
            boxId: box.id,
            positionId: sessionPosition.positionId,
            operatorId,
            countedByOperatorId,
          },
        });
      }

      const totalQty = body.cajas * body.unidadesPorCaja;
      const eventId = randomUUID();
      await tx.countEvent.create({
        data: {
          id: eventId,
          operationId: `${body.operationId}-0`,
          sessionId,
          positionId: sessionPosition.positionId,
          countRoundId: round.id,
          productId: body.productId,
          operatorId,
          quantity: totalQty,
          isCorrect: true,
          countedByOperatorId,
          inputMethod: "MANUAL",
          packageCount: body.cajas,
          unitsPerPackage: body.unidadesPorCaja,
          boxCountEntryId: entryId,
          notes: body.notes ?? null,
        },
      });

      return { boxCountEntryId: entryId, eventId, total: totalQty };
    });

    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    if (error instanceof Error && /Sesión|Posición|Ronda|Producto|Importación|Pallet|Caja|Operador|Digitador|contador|ya fue contada|aprobada/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
}
