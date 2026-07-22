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
        sessionPositions: {
          include: {
            position: {
              include: {
                rack: { include: { zone: { include: { floor: { include: { warehouse: true } } } } } },
                compartment: true,
                depthSlot: true,
              },
            },
            rounds: { orderBy: { roundNumber: "desc" }, take: 1 },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { sessionPositions: true } },
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
    const userId = auth.session!.user.id;

    const { id } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!["DRAFT", "OPEN", "PAUSED", "REVIEW", "CLOSED"].includes(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.inventorySession.findUnique({ where: { id } });
      if (!session) throw new Error("Sesión no encontrada");

      // REVIEW → CLOSED: validate all positions resolved
      if (status === "CLOSED") {
        if (session.schemaVersion === 2) {
          if (session.status !== "REVIEW") {
            throw new Error("La sesión debe pasar a REVIEW antes de cerrarse");
          }

          const pendingPositions = await tx.sessionPosition.count({
            where: { sessionId: id, status: { notIn: ["APPROVED", "EXCLUDED"] } },
          });

          if (pendingPositions > 0) {
            throw new Error(`No se puede cerrar: ${pendingPositions} posición(es) sin resolver. Revisa y aprueba todas las posiciones.`);
          }

          // Snapshot approved results
          const approved = await tx.sessionPosition.findMany({
            where: { sessionId: id, status: "APPROVED" },
            include: {
              rounds: { where: { status: "APPROVED" }, include: { events: { where: { reversedAt: null } } } },
            },
          });

          console.log(`[AUDIT] Close session V2 ${session.code}. Approved: ${approved.length} positions. User: ${userId}.`);
        }

        return tx.inventorySession.update({
          where: { id },
          data: { status, closedAt: new Date() },
        });
      }

      // DRAFT → OPEN: validate positions exist
      if (status === "OPEN") {
        const posCount = await tx.sessionPosition.count({ where: { sessionId: id } });
        if (posCount === 0) {
          throw new Error("No se puede abrir: la sesión no tiene posiciones");
        }
      }

      return tx.inventorySession.update({
        where: { id },
        data: { status },
      });
    });

    return NextResponse.json({ session: result });
  } catch (error) {
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    return apiError(error);
  }
}
