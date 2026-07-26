import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";

const structureSchema = z.object({
  importCode: z.string().trim().min(1).max(100),
  palletNumber: z.string().trim().max(30).optional(),
  boxNumbers: z.array(z.number().int().min(1).max(20)).min(1).max(20),
}).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN", "COUNTER");
    if (!auth.authorized) return auth.response;

    const { id: sessionId } = await context.params;

    const session = await prisma.inventorySession.findUnique({ where: { id: sessionId } });
    if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    const body = structureSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const imp = await tx.import.upsert({
        where: { code: body.importCode.trim() },
        update: {},
        create: { id: randomUUID(), code: body.importCode.trim(), description: body.importCode.trim() },
      });

      let pallet: { id: string; number: string } | null = null;
      if (body.palletNumber && body.palletNumber.trim()) {
        pallet = await tx.pallet.upsert({
          where: { importId_number: { importId: imp.id, number: body.palletNumber.trim() } },
          update: {},
          create: { id: randomUUID(), importId: imp.id, number: body.palletNumber.trim() },
        });
      } else {
        const firstPallet = await tx.pallet.findFirst({
          where: { importId: imp.id, active: true },
          orderBy: { number: "asc" },
        });
        if (firstPallet) pallet = firstPallet;
      }

      const boxes: { id: string; number: string }[] = [];

      if (pallet) {
        for (const num of body.boxNumbers) {
          const boxNumber = String(num);
          const existing = await tx.box.findUnique({
            where: { palletId_number: { palletId: pallet.id, number: boxNumber } },
          });
          if (existing) {
            boxes.push({ id: existing.id, number: existing.number });
          } else {
            const created = await tx.box.create({
              data: {
                id: randomUUID(),
                palletId: pallet.id,
                number: boxNumber,
              },
            });
            boxes.push({ id: created.id, number: created.number });
          }
        }
      }

      return { import: { id: imp.id, code: imp.code }, pallet: pallet ? { id: pallet.id, number: pallet.number } : null, boxes };
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    await context.params;
    const url = new URL(request.url);
    const importCode = url.searchParams.get("importCode");

    if (!importCode) {
      const imports = await prisma.import.findMany({
        where: { active: true },
        orderBy: { code: "asc" },
        take: 50,
      });
      return NextResponse.json({ imports: imports.map((i) => ({ id: i.id, code: i.code, description: i.description })) });
    }

    const imp = await prisma.import.findUnique({ where: { code: importCode } });
    if (!imp) return NextResponse.json({ pallets: [], boxes: [] });

    const pallets = await prisma.pallet.findMany({
      where: { importId: imp.id, active: true },
      orderBy: { number: "asc" },
    });

    const palletId = url.searchParams.get("palletId");
    let boxes: { id: string; number: string }[] = [];

    if (palletId) {
      const palletBoxes = await prisma.box.findMany({
        where: { palletId, active: true },
        orderBy: { number: "asc" },
      });
      boxes = palletBoxes.map((b) => ({ id: b.id, number: b.number }));
    } else if (pallets.length === 1) {
      const palletBoxes = await prisma.box.findMany({
        where: { palletId: pallets[0].id, active: true },
        orderBy: { number: "asc" },
      });
      boxes = palletBoxes.map((b) => ({ id: b.id, number: b.number }));
    }

    return NextResponse.json({
      import: { id: imp.id, code: imp.code },
      pallets: pallets.map((p) => ({ id: p.id, number: p.number })),
      boxes,
    });
  } catch (error) {
    return apiError(error);
  }
}
