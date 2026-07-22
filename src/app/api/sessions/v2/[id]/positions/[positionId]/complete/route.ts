import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireAuth } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const completeSchema = z.object({
  roundId: z.string().uuid(),
  operationId: z.string().uuid(),
  emptyConfirmed: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; positionId: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return auth.response;
    const userId = auth.session!.user.id;

    const { id: sessionId, positionId } = await context.params;
    const body = completeSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const sessionPosition = await tx.sessionPosition.findUnique({
        where: { sessionId_positionId: { sessionId, positionId } },
      });
      if (!sessionPosition) throw new Error("Posición no asignada a esta sesión");
      if (sessionPosition.status === "COMPLETED") throw new Error("Posición ya completada");

      const round = await tx.countRound.findUnique({ where: { id: body.roundId } });
      if (!round || round.sessionPositionId !== sessionPosition.id) throw new Error("Ronda inválida");

      await tx.countRound.update({
        where: { id: body.roundId },
        data: { status: "SUBMITTED", submittedAt: new Date() },
      });

      await tx.sessionPosition.update({
        where: { id: sessionPosition.id },
        data: { status: "COMPLETED", completedAt: new Date(), notes: body.notes ?? null },
      });

      return { ok: true };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    if (error instanceof Error && /asignada|completada|inválida/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
}
