import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { getRack, updateRack } from "@/server/repositories/location-repository";

const schema = z.object({
  code: z.string().trim().min(1).max(20).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  widthMm: z.number().int().positive().optional().nullable(),
  heightMm: z.number().int().positive().optional().nullable(),
  depthMm: z.number().int().positive().optional().nullable(),
  orderIndex: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;
    const { id } = await context.params;
    const rack = await getRack(id);
    if (!rack) return NextResponse.json({ error: "Rack no encontrado" }, { status: 404 });
    return NextResponse.json({ rack });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const rack = await updateRack(id, body);
    return NextResponse.json({ rack });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
