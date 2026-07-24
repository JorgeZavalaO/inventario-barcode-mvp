import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(3).max(120),
});

function sessionCode() {
  return `V3-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN");
    if (!auth.authorized) return auth.response;

    const body = createSchema.parse(await request.json());
    const sessionId = randomUUID();
    let code = sessionCode();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await prisma.inventorySession.findUnique({ where: { code } });
      if (!existing) break;
      code = sessionCode();
    }

    const session = await prisma.inventorySession.create({
      data: {
        id: sessionId,
        code,
        name: body.name,
        warehouse: "Almacén principal",
        status: "OPEN",
        schemaVersion: 3,
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}

export async function GET() {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    const sessions = await prisma.inventorySession.findMany({
      where: { schemaVersion: 3, status: { not: "CANCELLED" } },
      include: {
        _count: { select: { countEvents: true, boxCountEntries: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    return apiError(error);
  }
}
