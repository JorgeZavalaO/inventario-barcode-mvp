import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
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
        operator: { select: { name: true } },
        countedByOperator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const boxMap = new Map<string, typeof boxEntries>();
    for (const entry of boxEntries) {
      const key = entry.boxId;
      if (!boxMap.has(key)) boxMap.set(key, []);
      boxMap.get(key)!.push(entry);
    }

    const differences = Array.from(boxMap.entries()).map(([boxId, entries]) => {
      const latestEntry = [...entries].sort((a, b) => {
        const roundDifference = b.countRound.roundNumber - a.countRound.roundNumber;
        return roundDifference || b.createdAt.getTime() - a.createdAt.getTime();
      })[0];
      const box = latestEntry.box;
      const importCode = box.pallet.import.code;
      const palletNumber = box.pallet.number;
      const boxNumber = box.number;

      const productMap = new Map<string, {
        expected: number;
        counted: number;
        product: { id: string; code: string; description: string; unit: string };
        hasEvent: boolean;
        isCorrect: boolean;
        comments: string[];
        cajas: number;
        unidadesPorCaja: number;
      }>();

      for (const bp of box.boxProducts) {
        productMap.set(bp.productId, {
          expected: Number(bp.expectedQty ?? 0),
          counted: 0,
          product: bp.product,
          hasEvent: false,
          isCorrect: true,
          comments: [],
          cajas: 0,
          unidadesPorCaja: 0,
        });
      }

      let totalEvents = 0;
      for (const event of latestEntry.countEvents) {
        totalEvents++;
        const existing = productMap.get(event.productId);
        if (existing) {
          existing.counted += Number(event.quantity);
          existing.hasEvent = true;
          existing.isCorrect = existing.isCorrect && event.isCorrect;
          existing.cajas += Number(event.packageCount ?? 0);
          existing.unidadesPorCaja = Number(event.unitsPerPackage ?? existing.unidadesPorCaja);
          if (event.notes?.trim()) existing.comments.push(event.notes.trim());
        } else {
          productMap.set(event.productId, {
            expected: 0,
            counted: Number(event.quantity),
            product: event.product,
            hasEvent: true,
            isCorrect: event.isCorrect,
            comments: event.notes?.trim() ? [event.notes.trim()] : [],
            cajas: Number(event.packageCount ?? 0),
            unidadesPorCaja: Number(event.unitsPerPackage ?? 0),
          });
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
        reviewStatus: !p.hasEvent ? "NO_REGISTRATION" : p.isCorrect ? "CORRECT" : "INCORRECT",
        comment: Array.from(new Set(p.comments)).join(" · "),
        cajas: p.cajas,
        unidadesPorCaja: p.unidadesPorCaja,
      }));

      const totalExpected = products.reduce((s, p) => s + p.expectedQty, 0);
      const totalCounted = products.reduce((s, p) => s + p.countedQty, 0);

      return {
        boxId,
        importCode,
        palletNumber,
        boxNumber,
        status: latestEntry.countRound.status,
        roundId: latestEntry.countRoundId,
        boxCountEntryId: latestEntry.id,
        totalExpected,
        totalCounted,
        difference: totalCounted - totalExpected,
        diffType: totalCounted - totalExpected > 0 ? "sobrante" : totalCounted - totalExpected < 0 ? "faltante" : "coincide",
        products,
        eventCount: totalEvents,
        countedAt: latestEntry.createdAt,
        digitizerName: latestEntry.operator.name,
        countedByName: latestEntry.countedByOperator?.name ?? latestEntry.operator.name,
      };
    });

    differences.sort((a, b) => b.countedAt.getTime() - a.countedAt.getTime());

    const summary = {
      totalBoxes: differences.length,
      matchingBoxes: differences.filter((d) => d.diffType === "coincide").length,
      differingBoxes: differences.filter((d) => d.diffType !== "coincide").length,
      totalExpected: differences.reduce((s, d) => s + d.totalExpected, 0),
      totalCounted: differences.reduce((s, d) => s + d.totalCounted, 0),
    };

    const productMapGlobal = new Map<string, {
      productId: string;
      productCode: string;
      productDescription: string;
      productUnit: string;
      countedQty: number;
      expectedQty: number;
      cajasSet: Set<string>;
      comments: string[];
    }>();

    for (const diff of differences) {
      for (const p of diff.products) {
        const existing = productMapGlobal.get(p.productId);
        if (existing) {
          existing.countedQty += p.countedQty;
          existing.expectedQty += p.expectedQty;
          existing.cajasSet.add(diff.boxId);
          if (p.comment) existing.comments.push(p.comment);
        } else {
          productMapGlobal.set(p.productId, {
            productId: p.productId,
            productCode: p.productCode,
            productDescription: p.productDescription,
            productUnit: p.productUnit,
            countedQty: p.countedQty,
            expectedQty: p.expectedQty,
            cajasSet: new Set([diff.boxId]),
            comments: p.comment ? [p.comment] : [],
          });
        }
      }
    }

    const productSummary = Array.from(productMapGlobal.values()).map((p) => {
      const diff = p.countedQty - p.expectedQty;
      return {
        productId: p.productId,
        productCode: p.productCode,
        productDescription: p.productDescription,
        productUnit: p.productUnit,
        totalCajas: p.cajasSet.size,
        countedQty: p.countedQty,
        expectedQty: p.expectedQty,
        difference: diff,
        diffType: diff > 0 ? "sobrante" : diff < 0 ? "faltante" : "coincide",
        comment: Array.from(new Set(p.comments)).join(" · "),
      };
    }).sort((a, b) => a.productDescription.localeCompare(b.productDescription));

    return NextResponse.json({ differences, summary, productSummary });
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

      const entry = await tx.boxCountEntry.findUnique({ where: { id: boxCountEntryId } });
      if (!entry || entry.sessionId !== sessionId || entry.countRoundId !== roundId) {
        throw new Error("Registro de caja inválido");
      }
      if (round.status !== "SUBMITTED") {
        throw new Error("La ronda debe estar enviada a revisión");
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

      if (action === "reject") {
        await tx.inventorySession.update({
          where: { id: sessionId },
          data: { status: "OPEN" },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    return apiError(error);
  }
}
