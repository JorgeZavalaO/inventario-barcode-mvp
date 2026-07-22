import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(3).max(120),
  warehouseId: z.string().uuid().optional(),
  scopeType: z.enum(["total", "floor", "zone", "rack", "positions"]).default("total"),
  scopeIds: z.array(z.string().uuid()).optional(),
});

function sessionCode() {
  return `V2-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
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

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.inventorySession.create({
        data: {
          id: sessionId,
          code,
          name: body.name,
          warehouse: "Almacén principal",
          status: "DRAFT",
          schemaVersion: 2,
        },
      });

      let positionIds: string[] = [];
      if (body.scopeType === "total") {
        const positions = await tx.storagePosition.findMany({
          where: { active: true },
          select: { id: true },
        });
        positionIds = positions.map((p) => p.id);
      } else if (body.scopeType === "floor" && body.scopeIds?.length) {
        const floors = await tx.floor.findMany({
          where: { id: { in: body.scopeIds } },
          include: { zones: { include: { racks: { include: { positions: { where: { active: true }, select: { id: true } } } } } } },
        });
        for (const f of floors) for (const z of f.zones) for (const r of z.racks) positionIds.push(...r.positions.map((p) => p.id));
      } else if (body.scopeType === "rack" && body.scopeIds?.length) {
        const racks = await tx.rack.findMany({
          where: { id: { in: body.scopeIds } },
          include: { positions: { where: { active: true }, select: { id: true } } },
        });
        for (const r of racks) positionIds.push(...r.positions.map((p) => p.id));
      } else if (body.scopeType === "positions" && body.scopeIds?.length) {
        positionIds = body.scopeIds;
      }

      const uniquePositionIds = [...new Set(positionIds)];

      if (uniquePositionIds.length > 0) {
        await tx.sessionPosition.createMany({
          data: uniquePositionIds.map((positionId) => ({
            id: randomUUID(),
            sessionId: session.id,
            positionId,
            status: "PENDING",
          })),
        });

        const snapshots = await tx.productLocationStock.findMany({
          where: { positionId: { in: uniquePositionIds } },
        });

        if (snapshots.length > 0) {
          await tx.sessionStockSnapshot.createMany({
            data: snapshots.map((s) => ({
              id: randomUUID(),
              sessionId: session.id,
              positionId: s.positionId,
              productId: s.productId,
              theoreticalStock: s.theoreticalStock,
              source: s.source,
            })),
          });
        }
      }

      return session;
    });

    return NextResponse.json({ session: result }, { status: 201 });
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
      where: { schemaVersion: 2, status: { not: "CANCELLED" } },
      include: {
        _count: { select: { sessionPositions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    return apiError(error);
  }
}
