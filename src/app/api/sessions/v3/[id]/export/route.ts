import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { formatDateLima, formatTimeLima } from "@/lib/date-time";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN");
    if (!auth.authorized) return auth.response;

    const { id } = await context.params;

    const session = await prisma.inventorySession.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    const boxEntries = await prisma.boxCountEntry.findMany({
      where: { sessionId: id },
      include: {
        box: {
          include: {
            pallet: { include: { import: true } },
            boxProducts: { include: { product: true } },
          },
        },
        countEvents: {
          where: { reversedAt: null },
          include: { product: { select: { code: true, description: true, unit: true } } },
        },
        countRound: true,
        operator: { select: { name: true } },
        countedByOperator: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const rows: any[] = [];
    const summaryRows: any[] = [];
    const productSummary = new Map<string, { code: string; description: string; unit: string; expected: number; counted: number }>();

    const boxMap = new Map<string, typeof boxEntries>();
    for (const entry of boxEntries) {
      const key = entry.boxId;
      if (!boxMap.has(key)) boxMap.set(key, []);
      boxMap.get(key)!.push(entry);
    }

    for (const [boxId, entries] of boxMap.entries()) {
      const firstEntry = entries[0];
      const box = firstEntry.box;
      const importCode = box.pallet.import.code;
      const palletNumber = box.pallet.number;
      const boxNumber = box.number;

      for (const entry of entries) {
        for (const event of entry.countEvents) {
          rows.push({
            Importación: importCode,
            Pallet: palletNumber,
            Caja: boxNumber,
            "Estado ronda": entry.countRound?.status ?? "OPEN",
            "Código producto": event.product.code,
            "Descripción producto": event.product.description,
            Unidad: event.product.unit,
            Cantidad: Number(event.quantity),
            "Método ingreso": event.inputMethod,
             Digitador: entry.operator.name,
             "Operario que contó": entry.countedByOperator?.name ?? entry.operator.name,
            Observaciones: event.notes ?? "",
            "Fecha conteo": formatDateLima(event.createdAt),
            "Hora conteo": formatTimeLima(event.createdAt),
          });
        }
      }

      const productMap = new Map<string, { expected: number; counted: number; product: any }>();
      for (const bp of box.boxProducts) {
        productMap.set(bp.productId, {
          expected: Number(bp.expectedQty ?? 0),
          counted: 0,
          product: bp.product,
        });
        const consolidated = productSummary.get(bp.productId) ?? {
          code: bp.product.code,
          description: bp.product.description,
          unit: bp.product.unit,
          expected: 0,
          counted: 0,
        };
        consolidated.expected += Number(bp.expectedQty ?? 0);
        productSummary.set(bp.productId, consolidated);
      }
      for (const entry of entries) {
        for (const event of entry.countEvents) {
          const existing = productMap.get(event.productId);
          if (existing) {
            existing.counted += Number(event.quantity);
          }
          const consolidated = productSummary.get(event.productId) ?? {
            code: event.product.code,
            description: event.product.description,
            unit: event.product.unit,
            expected: 0,
            counted: 0,
          };
          consolidated.counted += Number(event.quantity);
          productSummary.set(event.productId, consolidated);
        }
      }

      const products = Array.from(productMap.values());
      const totalExpected = products.reduce((s, p) => s + p.expected, 0);
      const totalCounted = products.reduce((s, p) => s + p.counted, 0);
      const diff = totalCounted - totalExpected;

      summaryRows.push({
        Importación: importCode,
        Pallet: palletNumber,
        Caja: boxNumber,
        "Total esperado": totalExpected,
        "Total contado": totalCounted,
        Diferencia: diff,
        Resultado: diff > 0 ? "SOBRANTE" : diff < 0 ? "FALTANTE" : "COINCIDE",
        "Estado ronda": firstEntry.countRound?.status ?? "OPEN",
      });
    }

    const wb = XLSX.utils.book_new();

    const wsDetail = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detalle eventos");

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen por caja");

    const wsProductSummary = XLSX.utils.json_to_sheet(
      Array.from(productSummary.values()).map((product) => ({
        "Código producto": product.code,
        "Descripción producto": product.description,
        Unidad: product.unit,
        "Total esperado": product.expected,
        "Total contado": product.counted,
        Diferencia: product.counted - product.expected,
        Resultado: product.counted - product.expected > 0
          ? "SOBRANTE"
          : product.counted - product.expected < 0
            ? "FALTANTE"
            : "COINCIDE",
      })),
    );
    XLSX.utils.book_append_sheet(wb, wsProductSummary, "Resumen por producto");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inventario-${session.code}-${formatDateLima(new Date())}.xlsx"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
