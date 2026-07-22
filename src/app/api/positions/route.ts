import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import { generatePhysicalPositionCode } from "@/lib/rack-validation";

const generateSchema = z.object({
  rackId: z.string().uuid(),
  compartmentIds: z.array(z.string().uuid()).min(1),
  generatePositions: z.boolean().default(true),
}).strict();

const depthDefinitions = [
  { code: "D01", name: "Frente", kind: "FRONT" as const },
];

class GenerationError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const body = generateSchema.parse(await request.json());
    const { rackId, compartmentIds } = body;

    const result = await prisma.$transaction(async (tx) => {
      const rack = await tx.rack.findUnique({ where: { id: rackId } });
      if (!rack) throw new GenerationError(404, "Rack no encontrado");
      const compartments = await tx.rackCompartment.findMany({
        where: { id: { in: compartmentIds }, rackId, active: true },
        include: { depthSlots: { where: { active: true }, orderBy: { depthIndex: "asc" } } },
      });
      if (compartments.length !== new Set(compartmentIds).size) throw new GenerationError(400, "Uno o más compartimentos no pertenecen a este rack");

      const zone = await tx.warehouseZone.findUnique({ where: { id: rack.zoneId }, include: { floor: { include: { warehouse: true } } } });
      const warehouseCode = zone?.floor.warehouse.code ?? "WH";
      const floorCode = zone?.floor.code ?? "FL";
      const created: Array<{ id: string; code: string }> = [];

      for (const compartment of compartments) {
        const depthSlots = compartment.depthSlots.length > 0 ? compartment.depthSlots : [depthDefinitions[0]];
        const total = compartment.columnCount * compartment.stackLevels * depthSlots.length;
        if (total > 1000) throw new GenerationError(400, `La matriz de ${compartment.code} supera 1000 posiciones`);

        for (const [depthIndex, definition] of depthSlots.entries()) {
          let depthSlot = definition;
          if (!("id" in depthSlot)) {
            depthSlot = await tx.rackDepthSlot.create({ data: {
              id: randomUUID(), compartmentId: compartment.id, code: definition.code,
              name: definition.name, kind: definition.kind, depthIndex,
            } });
          }
          const existing = await tx.storagePosition.findMany({ where: { depthSlotId: depthSlot.id } });
          const existingByCell = new Map(existing.map((position) => [`${position.columnIndex}:${position.stackIndex}`, position]));

          for (let columnIndex = 1; columnIndex <= compartment.columnCount; columnIndex += 1) {
            for (let stackIndex = 1; stackIndex <= compartment.stackLevels; stackIndex += 1) {
              if (existingByCell.has(`${columnIndex}:${stackIndex}`)) continue;
              const code = generatePhysicalPositionCode(warehouseCode, floorCode, rack.code, compartment.code, depthSlot.code, columnIndex, stackIndex);
              const codeConflict = await tx.storagePosition.findUnique({ where: { code }, select: { id: true } });
              if (codeConflict) continue;
              const position = await tx.storagePosition.create({ data: {
                id: randomUUID(), rackId, compartmentId: compartment.id, depthSlotId: depthSlot.id,
                columnIndex, stackIndex, code, qrValue: `LOC:v1:${randomUUID()}`,
              } });
              created.push(position);
            }
          }
        }
      }
      return { created };
    });

    return NextResponse.json({ positions: result.created, count: result.created.length }, { status: 201 });
  } catch (error) {
    if (error instanceof GenerationError) return NextResponse.json({ error: error.message }, { status: error.status });
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
      orderBy: [{ compartmentId: "asc" }, { depthSlotId: "asc" }, { columnIndex: "asc" }, { stackIndex: "asc" }],
    });
    return NextResponse.json({ positions });
  } catch (error) {
    return apiError(error);
  }
}
