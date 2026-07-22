import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN");
    if (!auth.authorized) return auth.response;

    const { id } = await context.params;

    const positions = await prisma.sessionPosition.findMany({
      where: { sessionId: id },
      include: {
        position: {
          include: {
            rack: { include: { zone: { include: { floor: { include: { warehouse: true } } } } } },
            compartment: true,
            depthSlot: true,
          },
        },
        rounds: {
          include: {
            events: { where: { reversedAt: null } },
          },
          orderBy: { roundNumber: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const snapshots = await prisma.sessionStockSnapshot.findMany({
      where: { sessionId: id },
      include: { product: { select: { id: true, code: true, description: true, unit: true } } },
    });

    const snapshotMap = new Map<string, typeof snapshots>();
    for (const s of snapshots) {
      const key = s.positionId;
      if (!snapshotMap.has(key)) snapshotMap.set(key, []);
      snapshotMap.get(key)!.push(s);
    }

    const differences = positions.map((sp) => {
      const roundTotals = sp.rounds.map((r) => {
        const total = r.events.reduce((s, e) => s + Number(e.quantity), 0);
        return { roundId: r.id, roundNumber: r.roundNumber, status: r.status, total, events: r.events.length };
      });

      const positionSnapshots = snapshotMap.get(sp.positionId) ?? [];
      const theoreticalTotal = positionSnapshots.reduce((s, sn) => s + Number(sn.theoreticalStock), 0);
      const lastRoundTotal = roundTotals.length > 0 ? roundTotals[roundTotals.length - 1].total : 0;
      const difference = lastRoundTotal - theoreticalTotal;

      const path = sp.position
        ? `${sp.position.rack.zone.floor.warehouse.name} / ${sp.position.rack.zone.floor.name} / ${sp.position.rack.name}`
        : "";

      const productsInPosition = roundTotals.length > 0
        ? sp.rounds[sp.rounds.length - 1].events.map((e: any) => ({
            code: e.productId,
            quantity: Number(e.quantity),
          }))
        : [];

      return {
        sessionPositionId: sp.id,
        positionId: sp.positionId,
        positionCode: sp.position?.code ?? "",
        path,
        status: sp.status,
        theoreticalTotal,
        countedTotal: lastRoundTotal,
        difference,
        diffType: difference > 0 ? "sobrante" : difference < 0 ? "faltante" : "coincide",
        roundTotals,
        products: productsInPosition,
        snapshots: positionSnapshots.map((sn) => ({
          productCode: sn.product.code,
          productDescription: sn.product.description,
          theoreticalStock: Number(sn.theoreticalStock),
        })),
      };
    });

    const summary = {
      totalPositions: differences.length,
      completedPositions: differences.filter((d) => d.status === "COMPLETED").length,
      pendingPositions: differences.filter((d) => d.status === "PENDING").length,
      matchingPositions: differences.filter((d) => d.diffType === "coincide" && d.status === "COMPLETED").length,
      differingPositions: differences.filter((d) => d.diffType !== "coincide" && d.status === "COMPLETED").length,
      totalTheoretical: differences.reduce((s, d) => s + d.theoreticalTotal, 0),
      totalCounted: differences.reduce((s, d) => s + d.countedTotal, 0),
    };

    return NextResponse.json({ differences, summary });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN");
    if (!auth.authorized) return auth.response;
    const userId = auth.session!.user.id;

    const { id: sessionId } = await context.params;
    const body = await request.json();
    const { sessionPositionId, roundId, action } = body;

    if (!sessionPositionId || !roundId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "sessionPositionId, roundId y action (approve|reject) requeridos" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const round = await tx.countRound.findUnique({
        where: { id: roundId },
        include: { sessionPosition: true },
      });
      if (!round || round.sessionPosition.sessionId !== sessionId) {
        throw new Error("Ronda inválida");
      }
      if (round.status !== "SUBMITTED") {
        throw new Error("La ronda debe estar en estado SUBMITTED");
      }

      await tx.countRound.update({
        where: { id: roundId },
        data: {
          status: action === "approve" ? "APPROVED" : "REJECTED",
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      });

      await tx.sessionPosition.update({
        where: { id: sessionPositionId },
        data: {
          status: action === "approve" ? "APPROVED" : "RECOUNT_REQUIRED",
          approvedAt: action === "approve" ? new Date() : undefined,
          approvedById: action === "approve" ? userId : undefined,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    return apiError(error);
  }
}
