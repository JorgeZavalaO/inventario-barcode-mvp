import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    const [products, imports, pallets, boxes, boxProducts] = await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        select: {
          id: true,
          code: true,
          barcode: true,
          description: true,
          unit: true,
          category: true,
          supplierCode: true,
          theoreticalStock: true,
          active: true,
        },
        orderBy: { code: "asc" },
      }),
      prisma.import.findMany({
        where: { active: true },
        select: { id: true, code: true, description: true, active: true },
        orderBy: { code: "asc" },
      }),
      prisma.pallet.findMany({
        where: { active: true },
        select: { id: true, importId: true, number: true, active: true },
        orderBy: { number: "asc" },
      }),
      prisma.box.findMany({
        where: { active: true },
        select: {
          id: true,
          palletId: true,
          number: true,
          expectedPositionId: true,
          active: true,
        },
        orderBy: { number: "asc" },
      }),
      prisma.boxProduct.findMany({
        where: { active: true },
        select: {
          id: true,
          boxId: true,
          productId: true,
          orderIndex: true,
          expectedQty: true,
          active: true,
        },
      }),
    ]);

    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        theoreticalStock: Number(p.theoreticalStock),
      })),
      imports,
      pallets,
      boxes,
      boxProducts: boxProducts.map((bp) => ({
        ...bp,
        expectedQty: bp.expectedQty ? Number(bp.expectedQty) : null,
      })),
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return apiError(error);
  }
}
