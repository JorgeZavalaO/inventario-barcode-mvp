import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    const { id } = await context.params;
    const session = await prisma.inventorySession.findUnique({
      where: { id },
      include: {
        boxCountEntries: {
          include: {
            box: {
              include: {
                pallet: { include: { import: true } },
                boxProducts: { include: { product: true } },
              },
            },
            countEvents: { where: { reversedAt: null }, include: { product: true } },
            countedByOperator: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        countEvents: {
          where: { reversedAt: null, boxCountEntryId: null },
          include: { product: true },
          orderBy: { createdAt: "desc" },
        },
        sessionParticipants: {
          include: { operator: { select: { id: true, name: true } } },
          orderBy: { joinedAt: "asc" },
        },
        _count: { select: { countEvents: true, boxCountEntries: true } },
      },
    });

    if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    return NextResponse.json({ session });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN");
    if (!auth.authorized) return auth.response;

    const { id } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!["OPEN", "PAUSED", "REVIEW", "CLOSED"].includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const session = await prisma.inventorySession.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    if (status === "CLOSED" && session.status !== "REVIEW") {
      return NextResponse.json({ error: "La sesión debe estar en REVIEW para cerrarse" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (status === "REVIEW") {
        await tx.countRound.updateMany({
          where: {
            sessionPosition: { sessionId: id },
            status: "OPEN",
          },
          data: {
            status: "SUBMITTED",
            submittedAt: new Date(),
          },
        });
      }

      return tx.inventorySession.update({
        where: { id },
        data: {
          status,
          closedAt: status === "CLOSED" ? new Date() : undefined,
        },
      });
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    return apiError(error);
  }
}
