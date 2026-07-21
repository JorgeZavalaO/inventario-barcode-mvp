import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { getRack, updateRack } from "@/server/repositories/location-repository";

const schema = z.object({
  design: z.any(),
});

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR");
    if (!auth.authorized) return auth.response;
    const { id } = await context.params;
    const { design } = schema.parse(await request.json());
    const rack = await updateRack(id, { design });
    return NextResponse.json({ rack });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;
    const { id } = await context.params;
    const rack = await getRack(id);
    if (!rack) return NextResponse.json({ error: "Rack no encontrado" }, { status: 404 });
    return NextResponse.json({ design: rack.design, compartments: rack.compartments });
  } catch (error) {
    return apiError(error);
  }
}
