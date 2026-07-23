import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { createZones } from "@/server/repositories/location-repository";

const zoneSchema = z.object({
  floorId: z.string().uuid(),
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  type: z.string().trim().max(60).optional(),
  orderIndex: z.number().int().optional(),
});

const bodySchema = z.union([zoneSchema, z.array(zoneSchema)]);

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const body = bodySchema.parse(await request.json());
    const items = Array.isArray(body) ? body : [body];
    const zones = await createZones(items);
    return NextResponse.json(
      Array.isArray(body) ? { zones } : { zone: zones[0] },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
