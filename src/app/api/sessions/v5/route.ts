import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/guards";

const createSchema = z.object({
  name: z.string().trim().min(3).max(120),
}).strict();

function sessionCode() {
  return `V5-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN");
    if (!auth.authorized) return auth.response;

    const body = createSchema.parse(await request.json());
    let code = sessionCode();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await prisma.inventorySession.findUnique({ where: { code } });
      if (!existing) break;
      code = sessionCode();
    }

    const session = await prisma.inventorySession.create({
      data: {
        id: randomUUID(),
        code,
        name: body.name,
        warehouse: "Captura rápida general",
        status: "OPEN",
        schemaVersion: 5,
      },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        code: session.code,
        name: session.name,
        status: session.status,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return apiError(error);
  }
}

export async function GET() {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    const sessions = await prisma.inventorySession.findMany({
      where: { schemaVersion: 5, status: { not: "CANCELLED" } },
      include: {
        _count: { select: { countEvents: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      sessions: sessions.map((session) => ({
        id: session.id,
        code: session.code,
        name: session.name,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        closedAt: session.closedAt?.toISOString() ?? null,
        recordCount: session._count.countEvents,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}
