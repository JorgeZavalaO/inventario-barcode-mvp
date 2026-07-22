import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireAuth } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const incidentSchema = z.object({
  type: z.enum(["product_not_found", "location_issue", "damaged_product", "other"]),
  description: z.string().trim().min(5).max(500),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; positionId: string }> }) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return auth.response;
    const userId = auth.session!.user.id;

    const { id: sessionId, positionId } = await context.params;
    const body = incidentSchema.parse(await request.json());

    const incident = await prisma.countIncident.create({
      data: {
        id: randomUUID(),
        sessionId,
        positionId,
        reportedById: userId,
        type: body.type,
        description: body.description,
      },
    });

    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
