import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN");
    if (!auth.authorized) return auth.response;

    const { id } = await context.params;

    const boxEntries = await prisma.boxCountEntry.findMany({
      where: { sessionId: id },
      include: {
        box: {
          include: {
            pallet: { include: { import: true } },
            boxProducts: { include: { product: true } },
          },
        },
        countEvents: {
          where: { reversedAt: null },
          include: { product: true },
        },
        countRound: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const boxMap = new Map<string, typeof boxEntries>();
    for (const entry of boxEntries) {
      const key = entry.boxId;
      if (!boxMap.has(key)) boxMap.set(key, []);
      boxMap.get(key)!.push(entry);
    }

    const differences = Array.from(boxMap.entries()).map(([boxId, entries]) => {
      const firstEntry = entries[0];
      const box = firstEntry.box;
      const importCode = box.pallet.import.code;
      const palletNumber = box.pallet.number;
      const boxNumber = box.number;

      const productMap = new Map<string, { expected: number; counted: number; product: any }>();

      for (const bp of box.boxProducts) {
        productMap.set(bp.productId, {
          expected: Number(bp.expectedQty ?? 0),
          counted: 0,
          product: bp.product,
        });
      }

      let totalEvents = 0;
      for (const entry of entries) {
        for (const event of entry.countEvents) {
          totalEvents++;
          const existing = productMap.get(event.productId);
          if (existing) {
            existing.counted += Number(event.quantity);
          } else {
            productMap.set(event.productId, {
              expected: 0,
              counted: Number(event.quantity),
              product: event.product,
            });
          }
        }
      }

      const products = Array.from(productMap.values()).map((p) => ({
        productId: p.product.id,
        productCode: p.product.code,
        productDescription: p.product.description,
        productUnit: p.product.unit,
        expectedQty: p.expected,
        countedQty: p.counted,
        difference: p.counted - p.expected,
        diffType: p.counted - p.expected > 0 ? "sobrante" : p.counted - p.expected < 0 ? "faltante" : "coincide",
      }));

      const totalExpected = products.reduce((s, p) => s + p.expectedQty, 0);
      const totalCounted = products.reduce((s, p) => s + p.countedQty, 0);

      return {
        boxId,
        importCode,
        palletNumber,
        boxNumber,
        status: firstEntry.countRound?.status ?? "OPEN",
        roundId: firstEntry.countRoundId,
        totalExpected,
        totalCounted,
        difference: totalCounted - totalExpected,
        diffType: totalCounted - totalExpected > 0 ? "sobrante" : totalCounted - totalExpected < 0 ? "faltante" : "coincide",
        products,
        eventCount: totalEvents,
        countedAt: firstEntry.createdAt,
      };
    });

    const summary = {
      totalBoxes: differences.length,
      matchingBoxes: differences.filter((d) => d.diffType === "coincide").length,
      differingBoxes: differences.filter((d) => d.diffType !== "coincide").length,
      totalExpected: differences.reduce((s, d) => s + d.totalExpected, 0),
      totalCounted: differences.reduce((s, d) => s + d.totalCounted, 0),
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
    const { boxCountEntryId, roundId, action } = body;

    if (!boxCountEntryId || !roundId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "boxCountEntryId, roundId y action (approve|reject) requeridos" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const round = await tx.countRound.findUnique({
        where: { id: roundId },
        include: { sessionPosition: true },
      });
      if (!round || round.sessionPosition.sessionId !== sessionId) {
        throw new Error("Ronda inválida");
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
        where: { id: round.sessionPositionId },
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
