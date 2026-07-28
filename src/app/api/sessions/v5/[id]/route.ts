import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/guards";

const statusSchema = z.object({
  status: z.enum(["OPEN", "PAUSED", "REVIEW", "CLOSED"]),
}).strict();

function serializeSession(session: {
  id: string;
  code: string;
  name: string;
  warehouse: string;
  status: string;
  schemaVersion: number;
  createdAt: Date;
  closedAt: Date | null;
}) {
  return {
    id: session.id,
    code: session.code,
    name: session.name,
    warehouse: session.warehouse,
    status: session.status,
    schemaVersion: session.schemaVersion,
    createdAt: session.createdAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
  };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    const { id } = await context.params;
    const session = await prisma.inventorySession.findUnique({
      where: { id },
      include: {
        countEvents: {
          where: { reversedAt: null },
          include: {
            product: { select: { id: true, code: true, description: true, unit: true } },
            operator: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        sessionParticipants: {
          include: { operator: { select: { id: true, name: true } } },
          orderBy: { joinedAt: "asc" },
        },
        _count: { select: { countEvents: true } },
      },
    });

    if (!session || session.schemaVersion !== 5) {
      return NextResponse.json({ error: "Sesión V5 no encontrada" }, { status: 404 });
    }

    const events = session.countEvents.map((event) => ({
      id: event.id,
      operationId: event.operationId,
      productId: event.productId,
      productCode: event.product.code,
      productDescription: event.product.description,
      productUnit: event.product.unit,
      operatorId: event.operatorId,
      operatorName: event.operator.name,
      cajas: Number(event.packageCount ?? 0),
      unidadesPorCaja: Number(event.unitsPerPackage ?? 0),
      total: Number(event.quantity),
      inputMethod: event.inputMethod,
      notes: event.notes ?? "",
      createdAt: event.createdAt.toISOString(),
    }));

    const summaryByProduct = new Map<string, {
      productId: string;
      productCode: string;
      productDescription: string;
      productUnit: string;
      cajas: number;
      total: number;
      records: number;
    }>();

    for (const event of events) {
      const current = summaryByProduct.get(event.productId);
      if (current) {
        current.cajas += event.cajas;
        current.total += event.total;
        current.records += 1;
      } else {
        summaryByProduct.set(event.productId, {
          productId: event.productId,
          productCode: event.productCode,
          productDescription: event.productDescription,
          productUnit: event.productUnit,
          cajas: event.cajas,
          total: event.total,
          records: 1,
        });
      }
    }

    return NextResponse.json({
      session: serializeSession(session),
      sessionParticipants: session.sessionParticipants.map(({ operator }) => operator),
      events,
      summary: {
        totalRecords: events.length,
        totalCajas: events.reduce((sum, event) => sum + event.cajas, 0),
        totalUnits: events.reduce((sum, event) => sum + event.total, 0),
        productCount: summaryByProduct.size,
      },
      productSummary: Array.from(summaryByProduct.values()).sort((a, b) =>
        a.productDescription.localeCompare(b.productDescription),
      ),
      totalRecordCount: session._count.countEvents,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN");
    if (!auth.authorized) return auth.response;

    const { id } = await context.params;
    const body = statusSchema.parse(await request.json());
    const session = await prisma.inventorySession.findUnique({ where: { id } });

    if (!session || session.schemaVersion !== 5) {
      return NextResponse.json({ error: "Sesión V5 no encontrada" }, { status: 404 });
    }
    if (body.status === "CLOSED" && session.status !== "REVIEW") {
      return NextResponse.json({ error: "La sesión debe estar en revisión para cerrarse" }, { status: 400 });
    }
    if (session.status === "CLOSED") {
      return NextResponse.json({ error: "La sesión ya está cerrada" }, { status: 400 });
    }

    const updated = await prisma.inventorySession.update({
      where: { id },
      data: {
        status: body.status,
        closedAt: body.status === "CLOSED" ? new Date() : null,
      },
    });

    return NextResponse.json({ session: serializeSession(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return apiError(error);
  }
}
