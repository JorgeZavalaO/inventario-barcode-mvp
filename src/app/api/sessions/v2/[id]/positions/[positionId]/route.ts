import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireAuth } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const startSchema = z.object({
  operationId: z.string().uuid(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; positionId: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return auth.response;
    const userId = auth.session!.user.id;

    const { id: sessionId, positionId } = await context.params;

    const result = await prisma.$transaction(async (tx) => {
      const sessionPosition = await tx.sessionPosition.findUnique({
        where: { sessionId_positionId: { sessionId, positionId } },
      });
      if (!sessionPosition) throw new Error("Posición no asignada a esta sesión");
      if (sessionPosition.status !== "PENDING" && sessionPosition.status !== "ASSIGNED" && sessionPosition.status !== "IN_PROGRESS") {
        throw new Error(`La posición está en estado ${sessionPosition.status}`);
      }

      let round: { id: string; roundNumber: number; status: string };
      if (sessionPosition.status === "IN_PROGRESS") {
        const existingRound = await tx.countRound.findFirst({
          where: { sessionPositionId: sessionPosition.id, status: "OPEN" },
          orderBy: { roundNumber: "desc" },
        });
        if (existingRound) {
          round = { id: existingRound.id, roundNumber: existingRound.roundNumber, status: existingRound.status };
        } else {
          const existingRounds = await tx.countRound.count({ where: { sessionPositionId: sessionPosition.id } });
          round = await tx.countRound.create({
            data: { id: randomUUID(), sessionPositionId: sessionPosition.id, roundNumber: existingRounds + 1, operatorId: userId, status: "OPEN" },
          });
        }
      } else {
        const existingRounds = await tx.countRound.count({ where: { sessionPositionId: sessionPosition.id } });
        round = await tx.countRound.create({
          data: { id: randomUUID(), sessionPositionId: sessionPosition.id, roundNumber: existingRounds + 1, operatorId: userId, status: "OPEN" },
        });
        await tx.sessionPosition.update({
          where: { id: sessionPosition.id },
          data: { status: "IN_PROGRESS", assignedToId: userId, startedAt: new Date() },
        });
      }

      const position = await tx.storagePosition.findUnique({
        where: { id: positionId },
        include: {
          compartment: true,
          depthSlot: true,
          rack: { include: { zone: { include: { floor: { include: { warehouse: true } } } } } },
        },
      });

      const path = position ? `${position.rack.zone.floor.name} / ${position.rack.name} / ${position.compartment.name} / ${position.depthSlot.name}` : "";

      const snapshot = await tx.sessionStockSnapshot.findMany({
        where: { sessionId, positionId },
        include: { product: { select: { id: true, code: true, description: true, unit: true } } },
      });

      return {
        sessionPositionId: sessionPosition.id,
        round: { id: round.id, number: round.roundNumber, status: round.status },
        position: { id: positionId, code: position?.code ?? "", path },
        snapshot,
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && /Posición no asignada|La posición está/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
