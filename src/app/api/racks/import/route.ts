import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { importLocations } from "@/server/repositories/location-repository";

const rowSchema = z.object({
  warehouseCode: z.string().trim().min(1),
  warehouseName: z.string().trim().min(1),
  floorCode: z.string().trim().min(1),
  floorName: z.string().trim().min(1),
  zoneCode: z.string().trim().min(1),
  zoneName: z.string().trim().min(1),
  rackCode: z.string().trim().min(1),
  rackName: z.string().trim().min(1),
  widthMm: z.coerce.number().int().positive().optional().nullable(),
  heightMm: z.coerce.number().int().positive().optional().nullable(),
  depthMm: z.coerce.number().int().positive().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const rows = Array.isArray(body) ? body : body.rows ?? [];

    const results: { row: number; status: string; rack?: string; error?: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      try {
        const data = rowSchema.parse(rows[i]);
        const result = await importLocations(data);
        results.push({ row: i + 1, status: "ok", rack: result.rack.code });
      } catch (error) {
        const message = error instanceof z.ZodError ? error.issues[0]?.message : String(error);
        results.push({ row: i + 1, status: "error", error: message });
      }
    }

    return NextResponse.json({ results, total: rows.length, ok: results.filter((r) => r.status === "ok").length });
  } catch (error) {
    return apiError(error);
  }
}
