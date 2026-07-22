import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  compartmentIds: z.array(z.string().uuid()).min(1).max(100),
}).strict();

class DeactivateError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const { id: rackId } = await context.params;
    const { compartmentIds } = schema.parse(await request.json());
    const uniqueIds = [...new Set(compartmentIds)];

    const result = await prisma.$transaction(async (tx) => {
      const rack = await tx.rack.findUnique({ where: { id: rackId }, select: { id: true } });
      if (!rack) throw new DeactivateError(404, "Rack no encontrado");

      const compartments = await tx.rackCompartment.findMany({
        where: { id: { in: uniqueIds }, rackId, active: true },
        select: { id: true },
      });
      if (compartments.length !== uniqueIds.length) {
        throw new DeactivateError(404, "Uno o más compartimentos no pertenecen a este rack");
      }

      const positions = await tx.storagePosition.findMany({
        where: { compartmentId: { in: uniqueIds }, active: true },
        select: {
          id: true,
          locationStocks: { where: { theoreticalStock: { gt: 0 } }, select: { id: true } },
          sessionPositions: {
            where: {
              status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS", "RECOUNT_REQUIRED"] },
              session: { status: { in: ["DRAFT", "OPEN", "PAUSED", "REVIEW"] } },
            },
            select: { id: true },
          },
        },
      });
      const protectedPositions = positions.filter((position) => position.locationStocks.length > 0 || position.sessionPositions.length > 0);
      if (protectedPositions.length > 0) {
        throw new DeactivateError(409, "No se pueden desactivar posiciones con stock o una sesión activa. Transfiere el stock o finaliza la sesión primero.");
      }

      const positionIds = positions.map((position) => position.id);
      if (positionIds.length === 0) return { deactivated: 0 };
      await tx.storagePosition.updateMany({ where: { id: { in: positionIds }, active: true }, data: { active: false } });
      await tx.rack.update({ where: { id: rackId }, data: { version: { increment: 1 } } });
      return { deactivated: positionIds.length };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DeactivateError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
