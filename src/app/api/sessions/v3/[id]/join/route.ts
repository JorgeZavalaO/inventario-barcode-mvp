import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const joinSchema = z.object({
  name: z.string().trim().min(2, "Ingresa un nombre válido").max(80),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: sessionId } = await context.params;
    const { name } = joinSchema.parse(await request.json());

    const session = await prisma.inventorySession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: "La sesión no existe" }, { status: 404 });

    let operator = await prisma.operator.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });

    if (!operator) {
      operator = await prisma.operator.create({
        data: { id: randomUUID(), name },
      });
    }

    await prisma.sessionParticipant.upsert({
      where: { sessionId_operatorId: { sessionId, operatorId: operator.id } },
      update: { lastSeenAt: new Date() },
      create: { sessionId, operatorId: operator.id },
    });

    return NextResponse.json({ operator: { id: operator.id, name: operator.name } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return apiError(error);
  }
}
