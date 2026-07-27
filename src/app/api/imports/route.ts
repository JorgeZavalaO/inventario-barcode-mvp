import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    const imports = await prisma.import.findMany({
      where: { active: true },
      include: {
        pallets: {
          where: { active: true },
          include: {
            boxes: {
              where: { active: true },
              include: {
                boxProducts: {
                  where: { active: true },
                  include: {
                    product: { select: { id: true, code: true, description: true, unit: true } },
                  },
                },
              },
              orderBy: { number: "asc" },
            },
          },
          orderBy: { number: "asc" },
        },
      },
      orderBy: { code: "asc" },
    });

    const result = imports.map((imp) => {
      const totalPallets = imp.pallets.length;
      const totalBoxes = imp.pallets.reduce((sum, pal) => sum + pal.boxes.length, 0);
      const totalProducts = imp.pallets.reduce(
        (sum, pal) => sum + pal.boxes.reduce((bs, box) => bs + box.boxProducts.length, 0),
        0,
      );

      return {
        id: imp.id,
        code: imp.code,
        description: imp.description,
        createdAt: imp.createdAt,
        totalPallets,
        totalBoxes,
        totalProducts,
        pallets: imp.pallets.map((pal) => ({
          id: pal.id,
          number: pal.number,
          boxes: pal.boxes.map((box) => ({
            id: box.id,
            number: box.number,
            products: box.boxProducts.map((bp) => ({
              productId: bp.product.id,
              productCode: bp.product.code,
              productDescription: bp.product.description,
              productUnit: bp.product.unit,
              expectedQty: bp.expectedQty != null ? Number(bp.expectedQty) : null,
              supplierCode: bp.supplierCode,
            })),
          })),
        })),
      };
    });

    return NextResponse.json({ imports: result });
  } catch (error) {
    return apiError(error);
  }
}
