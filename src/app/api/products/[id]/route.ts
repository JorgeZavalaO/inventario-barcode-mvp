import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase, getDb } from "@/lib/db";
import { apiError } from "@/lib/http";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDatabase();
    const { id } = await context.params;
    const sql = getDb();
    const [product] = await sql`
      SELECT id, code, barcode, description, unit, category,
        theoretical_stock::float8 AS theoretical_stock, active
      FROM products
      WHERE id = ${id}
    `;

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    return apiError(error);
  }
}
