import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { requireAuth, requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(2, "Ingresa un nombre válido").max(80),
});

export async function GET() {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    const operators = await prisma.operator.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ operators });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.authorized) return auth.response;

    const { name } = createSchema.parse(await request.json());
    const existing = await prisma.operator.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    const operator = existing ?? await prisma.operator.create({
      data: { id: randomUUID(), name },
    });

    return NextResponse.json({ operator: { id: operator.id, name: operator.name } }, { status: existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return apiError(error);
  }
}
