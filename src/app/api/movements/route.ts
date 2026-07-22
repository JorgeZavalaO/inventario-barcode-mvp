import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const movementSchema = z.object({
  productId: z.string().uuid(),
  fromPositionId: z.string().uuid(),
  toPositionId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  reason: z.enum(["replenishment", "reordering", "correction", "transfer"]),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN");
    if (!auth.authorized) return auth.response;

    const body = movementSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const fromStock = await tx.productLocationStock.findUnique({
        where: { productId_positionId: { productId: body.productId, positionId: body.fromPositionId } },
      });
      if (!fromStock || Number(fromStock.theoreticalStock) < body.quantity) {
        throw new Error("Stock insuficiente en origen");
      }

      await tx.productLocationStock.update({
        where: { productId_positionId: { productId: body.productId, positionId: body.fromPositionId } },
        data: { theoreticalStock: { decrement: body.quantity } },
      });

      await tx.productLocationStock.upsert({
        where: { productId_positionId: { productId: body.productId, positionId: body.toPositionId } },
        update: { theoreticalStock: { increment: body.quantity }, source: "movement" },
        create: {
          id: randomUUID(),
          productId: body.productId,
          positionId: body.toPositionId,
          theoreticalStock: body.quantity,
          source: "movement",
        },
      });

      const audit = {
        id: randomUUID(),
        productId: body.productId,
        fromPositionId: body.fromPositionId,
        toPositionId: body.toPositionId,
        quantity: body.quantity,
        reason: body.reason,
        notes: body.notes ?? null,
        createdBy: auth.session!.user.id,
      };

      // Log movement
      console.log(`[MOVEMENT] Product ${body.productId}: ${body.quantity} from ${body.fromPositionId} to ${body.toPositionId} (${body.reason})`);

      return audit;
    });

    return NextResponse.json({ movement: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    if (error instanceof Error && /Stock insuficiente/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    const productId = request.nextUrl.searchParams.get("productId");
    const positionId = request.nextUrl.searchParams.get("positionId");

    // Return stocks as movement-like data
    const where: any = {};
    if (productId) where.productId = productId;
    if (positionId) where.positionId = positionId;

    const stocks = await prisma.productLocationStock.findMany({
      where,
      include: {
        product: { select: { code: true, description: true } },
        position: { select: { code: true } },
      },
    });

    return NextResponse.json({ stocks });
  } catch (error) {
    return apiError(error);
  }
}
