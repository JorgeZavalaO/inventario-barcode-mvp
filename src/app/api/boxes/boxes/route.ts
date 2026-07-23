import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;
    const palletId = request.nextUrl.searchParams.get("palletId")?.trim();
    const importId = request.nextUrl.searchParams.get("importId")?.trim();

    if (!palletId && !importId) {
      return NextResponse.json({ error: "palletId o importId requerido" }, { status: 400 });
    }

    let where: any = { active: true };
    if (palletId) {
      where.palletId = palletId;
    } else if (importId) {
      const pallets = await prisma.pallet.findMany({
        where: { importId, active: true },
        select: { id: true },
      });
      where.palletId = { in: pallets.map((p) => p.id) };
    }

    const boxes = await prisma.box.findMany({
      where,
      include: {
        boxProducts: {
          where: { active: true },
          select: { id: true, productId: true, orderIndex: true, expectedQty: true },
        },
      },
      orderBy: { number: "asc" },
    });
    return NextResponse.json({ boxes });
  } catch (error) {
    return apiError(error);
  }
}
