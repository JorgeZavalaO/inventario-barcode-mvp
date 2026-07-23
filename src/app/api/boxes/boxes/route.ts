import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;
    const palletId = request.nextUrl.searchParams.get("palletId")?.trim();
    if (!palletId) return NextResponse.json({ error: "palletId requerido" }, { status: 400 });
    const boxes = await prisma.box.findMany({
      where: { palletId, active: true },
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
