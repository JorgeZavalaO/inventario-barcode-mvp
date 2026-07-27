import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER");
    if (!auth.authorized) return auth.response;

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Parámetro 'code' requerido" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: {
        active: true,
        OR: [
          { code: { equals: code.trim(), mode: "insensitive" } },
          { barcode: { equals: code.trim(), mode: "insensitive" } },
          { description: { contains: code.trim(), mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        code: true,
        description: true,
        unit: true,
        supplierCode: true,
        theoreticalStock: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      product: {
        ...product,
        theoreticalStock: Number(product.theoreticalStock),
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
