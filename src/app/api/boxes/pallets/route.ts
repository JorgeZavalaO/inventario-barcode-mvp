import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;
    const importId = request.nextUrl.searchParams.get("importId")?.trim();
    if (!importId) return NextResponse.json({ error: "importId requerido" }, { status: 400 });
    const pallets = await prisma.pallet.findMany({
      where: { importId, active: true },
      orderBy: { number: "asc" },
    });
    return NextResponse.json({ pallets });
  } catch (error) {
    return apiError(error);
  }
}
