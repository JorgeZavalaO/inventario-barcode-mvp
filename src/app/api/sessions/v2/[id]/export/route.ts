import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN");
    if (!auth.authorized) return auth.response;

    const { id } = await context.params;

    const session = await prisma.inventorySession.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    const positions = await prisma.sessionPosition.findMany({
      where: { sessionId: id },
      include: {
        position: {
          include: {
            rack: { include: { zone: { include: { floor: { include: { warehouse: true } } } } } },
            compartment: true,
            depthSlot: true,
          },
        },
        rounds: {
          include: {
            events: {
              where: { reversedAt: null },
              include: { product: { select: { code: true, description: true, unit: true } } },
            },
          },
          orderBy: { roundNumber: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const snapshots = await prisma.sessionStockSnapshot.findMany({
      where: { sessionId: id },
      include: { product: { select: { code: true, description: true } } },
    });

    const rows: any[] = [];
    const summaryRows: any[] = [];

    for (const sp of positions) {
      const pos = sp.position;
      const path = pos ? `${pos.rack.zone.floor.warehouse.code}-${pos.rack.zone.floor.code}-${pos.rack.code}` : "";
      const posSnapshots = snapshots.filter((s) => s.positionId === sp.positionId);

      for (const round of sp.rounds) {
        const operatorName = "—";
        for (const event of round.events) {
          rows.push({
            Posición: pos?.code ?? "",
            "Ruta física": path,
            Compartimento: pos?.compartment.name ?? "",
            Profundidad: pos?.depthSlot.name ?? "",
            "Estado posición": sp.status,
            Ronda: round.roundNumber,
            "Estado ronda": round.status,
            "Código producto": event.product.code,
            "Descripción producto": event.product.description,
            Unidad: event.product.unit,
            Cantidad: Number(event.quantity),
            "Método ingreso": event.inputMethod,
            Operador: operatorName,
            "Fecha conteo": event.createdAt.toISOString().split("T")[0],
            "Hora conteo": event.createdAt.toISOString().split("T")[1].slice(0, 8),
          });
        }

        if (round.events.length === 0) {
          rows.push({
            Posición: pos?.code ?? "",
            "Ruta física": path,
            Compartimento: pos?.compartment.name ?? "",
            Profundidad: pos?.depthSlot.name ?? "",
            "Estado posición": sp.status,
            Ronda: round.roundNumber,
            "Estado ronda": round.status,
            "Código producto": "—",
            "Descripción producto": "SIN EVENTOS",
            Cantidad: 0,
            "Fecha conteo": round.createdAt.toISOString().split("T")[0],
          });
        }
      }

      // Summary row per position
      const lastRound = sp.rounds[sp.rounds.length - 1];
      const countedTotal = lastRound ? lastRound.events.reduce((s, e) => s + Number(e.quantity), 0) : 0;
      const theoreticalTotal = posSnapshots.reduce((s, sn) => s + Number(sn.theoreticalStock), 0);
      const diff = countedTotal - theoreticalTotal;

      summaryRows.push({
        Posición: pos?.code ?? "",
        "Ruta física": path,
        "Stock teórico": theoreticalTotal,
        "Stock contado": countedTotal,
        Diferencia: diff,
        "Resultado": diff > 0 ? "SOBRANTE" : diff < 0 ? "FALTANTE" : "COINCIDE",
        "Estado posición": sp.status,
        "Total rondas": sp.rounds.length,
        "Última ronda": lastRound?.roundNumber ?? 0,
        "Estado última ronda": lastRound?.status ?? "N/A",
      });
    }

    const wb = XLSX.utils.book_new();

    const wsDetail = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detalle eventos");

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen por posición");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inventario-${session.code}-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
