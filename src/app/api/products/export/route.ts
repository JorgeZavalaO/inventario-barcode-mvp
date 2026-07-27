import { NextRequest } from "next/server";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireRole("ADMIN", "SUPERVISOR", "COUNTER", "VIEWER");
    if (!auth.authorized) return auth.response;

    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: {
        code: true,
        barcode: true,
        description: true,
        unit: true,
        category: true,
        supplierCode: true,
        theoreticalStock: true,
      },
    });

    const rows = products.map((p) => ({
      Código: p.code,
      Barcode: p.barcode ?? "",
      Descripción: p.description,
      Unidad: p.unit,
      Categoría: p.category ?? "",
      "Código proveedor": p.supplierCode ?? "",
      "Stock teórico": Number(p.theoreticalStock),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 40 },
      { wch: 10 },
      { wch: 20 },
      { wch: 20 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Productos");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="productos.xlsx"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
