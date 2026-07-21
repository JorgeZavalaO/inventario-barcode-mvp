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
  orderIndex: z.number().int().optional(),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const { id: rackId } = await context.params;
    const body = createSchema.parse(await request.json());
    const compartment = await prisma.rackCompartment.create({
      data: { id: randomUUID(), rackId, orderIndex: 0, ...body },
    });
    return NextResponse.json({ compartment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
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
