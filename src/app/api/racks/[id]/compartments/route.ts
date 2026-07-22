import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  x: z.number().int().min(0).max(10000),
  y: z.number().int().min(0).max(10000),
  width: z.number().int().min(1).max(10000),
  height: z.number().int().min(1).max(10000),
  moduleLabel: z.string().max(20).optional().nullable(),
  levelLabel: z.string().max(20).optional().nullable(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const { id: rackId } = await context.params;
    const body = createSchema.parse(await request.json());

    const rack = await prisma.rack.findUnique({ where: { id: rackId }, select: { widthMm: true, heightMm: true } });

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
      select: { x: true, y: true, width: true, height: true },
    });

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
    const body = await request.json();
    const { compartmentId, ...data } = body;

    if (!compartmentId) return NextResponse.json({ error: "compartmentId requerido" }, { status: 400 });

    // Validate bounds if x/width or y/height changed
    if (data.x !== undefined || data.width !== undefined) {
      const comp = await prisma.rackCompartment.findUnique({ where: { id: compartmentId } });
      const rack = await prisma.rack.findUnique({ where: { id: rackId }, select: { widthMm: true, heightMm: true } });
      const newX = data.x ?? comp!.x;
      const newW = data.width ?? comp!.width;
      const maxX = rack?.widthMm ?? 10000;
      if (newX + newW > maxX) {
        return NextResponse.json({ error: `Compartimento excede el ancho del rack (${maxX})` }, { status: 400 });
      }
      const newY = data.y ?? comp!.y;
      const newH = data.height ?? comp!.height;
      const maxY = rack?.heightMm ?? 10000;
      if (newY + newH > maxY) {
        return NextResponse.json({ error: `Compartimento excede el alto del rack (${maxY})` }, { status: 400 });
      }
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
        depthSlots: { where: { active: true }, orderBy: { depthIndex: "asc" } },
      },
      orderBy: { orderIndex: "asc" },
    });
    return NextResponse.json({ compartments });
  } catch (error) {
    return apiError(error);
  }
}
