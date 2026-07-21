import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const upsertSchema = z.object({
  productId: z.string().uuid(),
  positionId: z.string().uuid(),
  theoreticalStock: z.coerce.number().min(0),
  minimumStock: z.coerce.number().min(0).optional().nullable(),
  isPrimary: z.boolean().optional(),
  source: z.string().max(60).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    const productId = request.nextUrl.searchParams.get("productId");
    const positionId = request.nextUrl.searchParams.get("positionId");

    const where: any = {};
    if (productId) where.productId = productId;
    if (positionId) where.positionId = positionId;

    const stocks = await prisma.productLocationStock.findMany({
      where,
      include: {
        product: { select: { id: true, code: true, description: true, unit: true } },
        position: {
          include: {
            rack: { include: { zone: { include: { floor: { include: { warehouse: true } } } } } },
          },
        },
      },
      orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ stocks });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;

    const body = upsertSchema.parse(await request.json());

    const stock = await prisma.productLocationStock.upsert({
      where: {
        productId_positionId: {
          productId: body.productId,
          positionId: body.positionId,
        },
      },
      update: {
        theoreticalStock: body.theoreticalStock,
        minimumStock: body.minimumStock ?? null,
        isPrimary: body.isPrimary ?? false,
        source: body.source ?? "manual",
        sourceUpdatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        productId: body.productId,
        positionId: body.positionId,
        theoreticalStock: body.theoreticalStock,
        minimumStock: body.minimumStock ?? null,
        isPrimary: body.isPrimary ?? false,
        source: body.source ?? "manual",
        sourceUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ stock }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN");
    if (!auth.authorized) return auth.response;

    const productId = request.nextUrl.searchParams.get("productId");
    const positionId = request.nextUrl.searchParams.get("positionId");

    if (!productId || !positionId) {
      return NextResponse.json({ error: "productId y positionId son requeridos" }, { status: 400 });
    }

    await prisma.productLocationStock.delete({
      where: { productId_positionId: { productId, positionId } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
