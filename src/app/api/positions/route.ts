import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const generateSchema = z.object({
  rackId: z.string().uuid(),
  compartmentIds: z.array(z.string().uuid()).min(1),
  generatePositions: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;

    const body = generateSchema.parse(await request.json());
    const { rackId, compartmentIds } = body;

    const compartments = await prisma.rackCompartment.findMany({
      where: { id: { in: compartmentIds }, rackId, active: true },
      include: { depthSlots: { where: { active: true } } },
    });

    if (compartments.length === 0) {
      return NextResponse.json({ error: "No se encontraron compartimentos" }, { status: 400 });
    }

    const rack = await prisma.rack.findUnique({ where: { id: rackId } });
    if (!rack) return NextResponse.json({ error: "Rack no encontrado" }, { status: 404 });

    const zone = await prisma.warehouseZone.findUnique({ where: { id: rack.zoneId }, include: { floor: { include: { warehouse: true } } } });
    const warehouseCode = zone?.floor.warehouse.code ?? "WH";
    const floorCode = zone?.floor.code ?? "FL";
    const zoneCode = zone?.code ?? "ZN";

    const created: any[] = [];

    for (const comp of compartments) {
      const depthSlots = comp.depthSlots.length > 0 ? comp.depthSlots : [{ id: "default", code: "D01", depthIndex: 0 } as any];

      for (const slot of depthSlots) {
        const depthSlotId = slot.id !== "default" ? slot.id : null;

        if (slot.id === "default") {
          const createdSlot = await prisma.rackDepthSlot.create({
            data: {
              id: randomUUID(),
              compartmentId: comp.id,
              code: "D01",
              name: "Frente",
              kind: "FRONT",
              depthIndex: 0,
            },
          });
          slot.id = createdSlot.id;
        }

        const posCode = `${warehouseCode}-${floorCode}-${rack.code}-${comp.code}-${slot.code}`;
        const qrValue = `LOC:v1:${randomUUID()}`;

        const existing = await prisma.storagePosition.findUnique({ where: { code: posCode } });
        if (existing) continue;

        const position = await prisma.storagePosition.create({
          data: {
            id: randomUUID(),
            rackId,
            compartmentId: comp.id,
            depthSlotId: slot.id,
            code: posCode,
            qrValue,
          },
        });
        created.push(position);
      }
    }

    return NextResponse.json({ positions: created, count: created.length }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;
    const rackId = request.nextUrl.searchParams.get("rackId");
    const where = rackId ? { rackId } : {};
    const positions = await prisma.storagePosition.findMany({
      where: { ...where, active: true },
      include: { compartment: true, depthSlot: true },
      orderBy: { code: "asc" },
    });
    return NextResponse.json({ positions });
  } catch (error) {
    return apiError(error);
  }
}
