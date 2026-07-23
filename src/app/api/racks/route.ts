import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { createRacks } from "@/server/repositories/location-repository";

const rackSchema = z.object({
  zoneId: z.string().uuid(),
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  widthMm: z.number().int().positive().optional().nullable(),
  heightMm: z.number().int().positive().optional().nullable(),
  depthMm: z.number().int().positive().optional().nullable(),
  orderIndex: z.number().int().optional(),
});

const bodySchema = z.union([rackSchema, z.array(rackSchema)]);

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const body = bodySchema.parse(await request.json());
    const items = Array.isArray(body) ? body : [body];
    const racks = await createRacks(items);
    return NextResponse.json(
      Array.isArray(body) ? { racks } : { rack: racks[0] },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
