import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { createWarehouse, getWarehouseTree } from "@/server/repositories/location-repository";

const schema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
});

export async function GET() {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;
    const tree = await getWarehouseTree();
    return NextResponse.json({ warehouses: tree });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const body = schema.parse(await request.json());
    const warehouse = await createWarehouse(body);
    return NextResponse.json({ warehouse }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return apiError(error);
  }
}
