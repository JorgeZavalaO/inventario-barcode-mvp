import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { getZone, updateZone } from "@/server/repositories/location-repository";

const schema = z.object({
  code: z.string().trim().min(1).max(20).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  type: z.string().trim().max(60).optional(),
  orderIndex: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;
    const { id } = await context.params;
    const zone = await getZone(id);
    if (!zone) return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
    return NextResponse.json({ zone });
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
    const zone = await updateZone(id, body);
    return NextResponse.json({ zone });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
