import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { getWarehouse, updateWarehouse } from "@/server/repositories/location-repository";

const schema = z.object({
  code: z.string().trim().min(1).max(20).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  active: z.boolean().optional(),
});

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;
    const { id } = await context.params;
    const warehouse = await getWarehouse(id);
    if (!warehouse) return NextResponse.json({ error: "Almacén no encontrado" }, { status: 404 });
    return NextResponse.json({ warehouse });
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
    const warehouse = await updateWarehouse(id, body);
    return NextResponse.json({ warehouse });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
