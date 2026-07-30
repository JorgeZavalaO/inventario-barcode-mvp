import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { apiError } from "@/lib/http";
import { formatDateLima, formatTimeLima } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/server/guards";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN");
    if (!auth.authorized) return auth.response;

    const { id } = await context.params;
    const session = await prisma.inventorySession.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, schemaVersion: true },
    });

    if (!session || session.schemaVersion !== 5) {
      return NextResponse.json({ error: "Sesión V5 no encontrada" }, { status: 404 });
    }

    const events = await prisma.countEvent.findMany({
      where: { sessionId: id, reversedAt: null },
      include: {
        product: { select: { id: true, code: true, description: true, unit: true } },
        operator: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const detailRows = events.map((event) => ({
      "Código producto": event.product.code,
      "Descripción producto": event.product.description,
      Unidad: event.product.unit,
      Cajas: Number(event.packageCount ?? 0),
      "Unidades por caja": Number(event.unitsPerPackage ?? 0),
      "Cantidad total": Number(event.quantity),
      Operador: event.operator.name,
      "Método ingreso": event.inputMethod,
      Comentario: event.notes ?? "",
      Fecha: formatDateLima(event.createdAt),
      Hora: formatTimeLima(event.createdAt),
    }));

    const productSummary = new Map<string, {
      code: string;
      description: string;
      unit: string;
      cajas: number;
      total: number;
      records: number;
    }>();

    for (const event of events) {
      const current = productSummary.get(event.product.id);
      if (current) {
        current.cajas += Number(event.packageCount ?? 0);
        current.total += Number(event.quantity);
        current.records += 1;
      } else {
        productSummary.set(event.product.id, {
          code: event.product.code,
          description: event.product.description,
          unit: event.product.unit,
          cajas: Number(event.packageCount ?? 0),
          total: Number(event.quantity),
          records: 1,
        });
      }
    }

    const summaryRows = Array.from(productSummary.values()).map((product) => ({
      "Código producto": product.code,
      "Descripción producto": product.description,
      Unidad: product.unit,
      Cajas: product.cajas,
      "Cantidad total": product.total,
      Registros: product.records,
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(detailRows),
      "Detalle registros",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summaryRows),
      "Resumen por producto",
    );

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="captura-v5-${session.code}-${formatDateLima(new Date())}.xlsx"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
