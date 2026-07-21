import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { createFloor } from "@/server/repositories/location-repository";

const schema = z.object({
  warehouseId: z.string().uuid(),
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  orderIndex: z.number().int().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const body = schema.parse(await request.json());
    const floor = await createFloor(body);
    return NextResponse.json({ floor }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
