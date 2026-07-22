import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    const importCode = request.nextUrl.searchParams.get("import")?.trim();
    const palletNumber = request.nextUrl.searchParams.get("pallet")?.trim();
    const boxNumber = request.nextUrl.searchParams.get("box")?.trim();

    if (!importCode || !palletNumber || !boxNumber) {
      return NextResponse.json({ error: "import, pallet y box son requeridos" }, { status: 400 });
    }

    const imp = await prisma.import.findUnique({ where: { code: importCode } });
    if (!imp) return NextResponse.json({ error: "Importación no encontrada" }, { status: 404 });

    const pallet = await prisma.pallet.findUnique({ where: { importId_number: { importId: imp.id, number: palletNumber } } });
    if (!pallet) return NextResponse.json({ error: "Pallet no encontrado" }, { status: 404 });

    const box = await prisma.box.findUnique({
      where: { palletId_number: { palletId: pallet.id, number: boxNumber } },
      include: {
        boxProducts: {
          where: { active: true },
          include: { product: { select: { id: true, code: true, description: true, unit: true } } },
          orderBy: { orderIndex: "asc" },
        },
        expectedPosition: { select: { id: true, code: true } },
      },
    });
    if (!box) return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 });

    const products = box.boxProducts.map((bp) => ({
      productId: bp.product.id,
      productCode: bp.product.code,
      productDescription: bp.product.description,
      productUnit: bp.product.unit,
      orderIndex: bp.orderIndex,
      expectedQty: bp.expectedQty ? Number(bp.expectedQty) : null,
    }));

    return NextResponse.json({
      box: {
        id: box.id,
        number: box.number,
        import: imp.code,
        pallet: pallet.number,
        products,
        expectedPosition: box.expectedPosition ? { id: box.expectedPosition.id, code: box.expectedPosition.code } : null,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
