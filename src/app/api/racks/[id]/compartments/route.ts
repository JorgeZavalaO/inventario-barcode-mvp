import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import { compartmentHasProtectedUse, validateCompartmentSet } from "@/lib/rack-validation";

const createSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  x: z.number().int().min(0).max(10000),
  y: z.number().int().min(0).max(10000),
  width: z.number().int().min(1).max(10000),
  height: z.number().int().min(1).max(10000),
  columnCount: z.number().int().min(1).max(100).default(1),
  stackLevels: z.number().int().min(1).max(100).default(1),
  moduleLabel: z.string().max(20).optional().nullable(),
  levelLabel: z.string().max(20).optional().nullable(),
}).strict();

const patchSchema = z.object({
  compartmentId: z.string().uuid(),
  code: z.string().trim().min(1).max(20).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  x: z.number().int().min(0).max(10000).optional(),
  y: z.number().int().min(0).max(10000).optional(),
  width: z.number().int().min(1).max(10000).optional(),
  height: z.number().int().min(1).max(10000).optional(),
  columnCount: z.number().int().min(1).max(100).optional(),
  stackLevels: z.number().int().min(1).max(100).optional(),
  moduleLabel: z.string().max(20).optional().nullable(),
  levelLabel: z.string().max(20).optional().nullable(),
  orderIndex: z.number().int().min(0).optional(),
}).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const { id: rackId } = await context.params;
    const body = createSchema.parse(await request.json());

    const rack = await prisma.rack.findUnique({ where: { id: rackId }, select: { widthMm: true, heightMm: true } });
    if (!rack) return NextResponse.json({ error: "Rack no encontrado" }, { status: 404 });

    // Validate compartment stays within rack bounds
    const maxX = rack?.widthMm ?? 10000;
    const maxY = rack?.heightMm ?? 10000;
    if (body.x + body.width > maxX) {
      return NextResponse.json({ error: `El compartimento excede el ancho del rack (${maxX}). x(${body.x}) + width(${body.width}) = ${body.x + body.width} > ${maxX}` }, { status: 400 });
    }
    if (body.y + body.height > maxY) {
      return NextResponse.json({ error: `El compartimento excede el alto del rack (${maxY}). y(${body.y}) + height(${body.height}) = ${body.y + body.height} > ${maxY}` }, { status: 400 });
    }

    // Validate no overlap with existing compartments
    const existing = await prisma.rackCompartment.findMany({
      where: { rackId, active: true },
      select: { code: true, x: true, y: true, width: true, height: true },
    });

    if (existing.some((comp) => comp.code === body.code)) {
      return NextResponse.json({ error: `El código ${body.code} ya está registrado en este rack` }, { status: 409 });
    }
    const historicalCode = await prisma.rackCompartment.findFirst({ where: { rackId, code: body.code }, select: { id: true } });
    if (historicalCode) return NextResponse.json({ error: `El código ${body.code} ya fue utilizado en este rack` }, { status: 409 });

    for (const comp of existing) {
      const noOverlap = body.x + body.width <= comp.x || comp.x + comp.width <= body.x
        || body.y + body.height <= comp.y || comp.y + comp.height <= body.y;
      if (!noOverlap) {
        return NextResponse.json({ error: `El compartimento solapa con otro en (${comp.x},${comp.y}) ${comp.width}×${comp.height}` }, { status: 400 });
      }
    }

    const compartment = await prisma.rackCompartment.create({
      data: { id: randomUUID(), rackId, orderIndex: existing.length, ...body },
    });

    // Auto-increment rack version
    await prisma.rack.update({ where: { id: rackId }, data: { version: { increment: 1 } } });

    return NextResponse.json({ compartment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const { id: rackId } = await context.params;
    const parsed = patchSchema.parse(await request.json());
    const { compartmentId, ...data } = parsed;
    const comp = await prisma.rackCompartment.findFirst({
      where: { id: compartmentId, rackId },
      include: {
        positions: {
          where: { active: true },
          select: {
            id: true,
            locationStocks: { where: { theoreticalStock: { gt: 0 } }, select: { id: true } },
            sessionPositions: {
              where: {
                status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS", "RECOUNT_REQUIRED"] },
                session: { status: { in: ["DRAFT", "OPEN", "PAUSED", "REVIEW"] } },
              },
              select: { id: true },
            },
          },
        },
        depthSlots: {
          select: {
            positions: {
              where: { active: true },
              select: {
                id: true,
                locationStocks: { where: { theoreticalStock: { gt: 0 } }, select: { id: true } },
                sessionPositions: {
                  where: {
                    status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS", "RECOUNT_REQUIRED"] },
                    session: { status: { in: ["DRAFT", "OPEN", "PAUSED", "REVIEW"] } },
                  },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });
    if (!comp) return NextResponse.json({ error: "Compartimento no encontrado en este rack" }, { status: 404 });
    const rack = await prisma.rack.findUnique({ where: { id: rackId }, select: { widthMm: true, heightMm: true } });
    const rackWidth = rack?.widthMm ?? 10000;
    const rackHeight = rack?.heightMm ?? 10000;
    const candidate = { ...comp, ...data, active: true };
    const active = await prisma.rackCompartment.findMany({ where: { rackId, active: true } });
    const issues = validateCompartmentSet(active.map((item) => item.id === comp.id ? candidate : item), rackWidth, rackHeight);
    if (issues.length > 0) return NextResponse.json({ error: issues[0].message }, { status: 400 });

    if ((data.columnCount !== undefined && data.columnCount < comp.columnCount)
      || (data.stackLevels !== undefined && data.stackLevels < comp.stackLevels)) {
      if (compartmentHasProtectedUse(comp)) return NextResponse.json({ error: "No se puede reducir la matriz porque tiene stock o una sesión activa" }, { status: 400 });
    }

    if (data.code && data.code !== comp.code) {
      const codeConflict = await prisma.rackCompartment.findFirst({ where: { rackId, code: data.code, NOT: { id: compartmentId } } });
      if (codeConflict) return NextResponse.json({ error: `El código ${data.code} ya está registrado en este rack` }, { status: 409 });
      if (compartmentHasProtectedUse(comp)) return NextResponse.json({ error: "No se puede cambiar el código porque tiene stock o una sesión activa" }, { status: 400 });
    }

    const compartment = await prisma.rackCompartment.update({
      where: { id: compartmentId },
      data,
    });

    if (Object.keys(data).length > 0) {
      await prisma.rack.update({ where: { id: rackId }, data: { version: { increment: 1 } } });
    }

    return NextResponse.json({ compartment });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const { id: rackId } = await context.params;
    const { searchParams } = new URL(request.url);
    const compartmentId = searchParams.get("compartmentId");

    if (!compartmentId) return NextResponse.json({ error: "compartmentId requerido" }, { status: 400 });

    const protectedCompartment = await prisma.rackCompartment.findFirst({ where: { id: compartmentId, rackId }, include: { positions: { where: { active: true }, select: { locationStocks: { where: { theoreticalStock: { gt: 0 } }, select: { id: true } }, sessionPositions: { where: { status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS", "RECOUNT_REQUIRED"] }, session: { status: { in: ["DRAFT", "OPEN", "PAUSED", "REVIEW"] } } }, select: { id: true } } } } } });
    if (!protectedCompartment) return NextResponse.json({ error: "Compartimento no encontrado en este rack" }, { status: 404 });
    if (compartmentHasProtectedUse(protectedCompartment)) {
      return NextResponse.json({ error: "No se puede eliminar un compartimento con stock o una sesión activa" }, { status: 400 });
    }

    // Soft delete — just deactivate
    await prisma.rackCompartment.update({
      where: { id: compartmentId, rackId },
      data: { active: false },
    });

    await prisma.rack.update({ where: { id: rackId }, data: { version: { increment: 1 } } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;
    const { id: rackId } = await context.params;
    const compartments = await prisma.rackCompartment.findMany({
      where: { rackId, active: true },
      include: {
        positions: { where: { active: true }, select: { id: true, locationStocks: { where: { theoreticalStock: { gt: 0 } }, select: { id: true } }, sessionPositions: { where: { status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS", "RECOUNT_REQUIRED"] }, session: { status: { in: ["DRAFT", "OPEN", "PAUSED", "REVIEW"] } } }, select: { id: true } } } },
        depthSlots: { where: { active: true }, include: { positions: { where: { active: true }, select: { id: true, locationStocks: { where: { theoreticalStock: { gt: 0 } }, select: { id: true } }, sessionPositions: { where: { status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS", "RECOUNT_REQUIRED"] }, session: { status: { in: ["DRAFT", "OPEN", "PAUSED", "REVIEW"] } } }, select: { id: true } } } } }, orderBy: { depthIndex: "asc" } },
      },
      orderBy: { orderIndex: "asc" },
    });
    return NextResponse.json({ compartments });
  } catch (error) {
    return apiError(error);
  }
}
