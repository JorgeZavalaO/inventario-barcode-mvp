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
      orderBy: { code: "asc" },
    });
    return NextResponse.json({ imports });
  } catch (error) {
    return apiError(error);
  }
}
