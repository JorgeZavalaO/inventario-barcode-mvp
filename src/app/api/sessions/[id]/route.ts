import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase, getDb } from "@/lib/db";
import { apiError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDatabase();
    const { id } = await context.params;
    const sql = getDb();

    const [session] = await sql`
      SELECT id, code, name, warehouse, status, created_at, closed_at
      FROM inventory_sessions
      WHERE id = ${id}
    `;

    if (!session) {
      return NextResponse.json({ error: "La sesión no existe" }, { status: 404 });
    }

    type ProductRow = {
      id: string;
      code: string;
      barcode: string;
      description: string;
      unit: string;
      category: string | null;
      active: boolean;
      theoretical_stock: number;
      counted: number;
    };

    const products = await sql<ProductRow[]>`
      SELECT
        p.id, p.code, p.barcode, p.description, p.unit, p.category, p.active,
        sp.theoretical_stock::float8 AS theoretical_stock,
        COALESCE(SUM(CASE WHEN ce.reversed_at IS NULL THEN ce.quantity ELSE 0 END), 0)::float8 AS counted
      FROM session_products sp
      INNER JOIN products p ON p.id = sp.product_id
      LEFT JOIN count_events ce
        ON ce.session_id = sp.session_id AND ce.product_id = sp.product_id
      WHERE sp.session_id = ${id}
      GROUP BY p.id, sp.theoretical_stock
      ORDER BY p.description ASC
    `;

    const events = await sql`
      SELECT
        ce.id, ce.operation_id, ce.quantity::float8 AS quantity,
        ce.input_method, ce.created_at, ce.reversed_at,
        p.code AS product_code, p.barcode,
        p.description AS product_description,
        o.id AS operator_id, o.name AS operator_name
      FROM count_events ce
      INNER JOIN products p ON p.id = ce.product_id
      INNER JOIN operators o ON o.id = ce.operator_id
      WHERE ce.session_id = ${id}
      ORDER BY ce.created_at DESC
      LIMIT 40
    `;

    const participants = await sql`
      SELECT
        o.id, o.name, participant.last_seen_at,
        (participant.last_seen_at > NOW() - INTERVAL '2 minutes') AS active,
        COUNT(ce.id) FILTER (WHERE ce.reversed_at IS NULL)::int AS scans,
        COALESCE(SUM(ce.quantity) FILTER (WHERE ce.reversed_at IS NULL), 0)::float8 AS total_units
      FROM session_participants participant
      INNER JOIN operators o ON o.id = participant.operator_id
      LEFT JOIN count_events ce
        ON ce.session_id = participant.session_id AND ce.operator_id = participant.operator_id
      WHERE participant.session_id = ${id}
      GROUP BY o.id, participant.last_seen_at
      ORDER BY participant.last_seen_at DESC
    `;

    const enrichedProducts = products.map((product) => ({
      ...product,
      difference: Number(product.counted) - Number(product.theoretical_stock),
    }));
    const countedProducts = enrichedProducts.filter((product) => Number(product.counted) > 0).length;
    const matchingProducts = enrichedProducts.filter(
      (product) => Number(product.counted) > 0 && Number(product.difference) === 0,
    ).length;
    const differentProducts = enrichedProducts.filter(
      (product) => Number(product.counted) > 0 && Number(product.difference) !== 0,
    ).length;
    const totalUnits = enrichedProducts.reduce(
      (total, product) => total + Number(product.counted),
      0,
    );

    return NextResponse.json({
      session,
      products: enrichedProducts,
      events,
      participants,
      stats: {
        totalProducts: enrichedProducts.length,
        countedProducts,
        pendingProducts: Math.max(enrichedProducts.length - countedProducts, 0),
        matchingProducts,
        differentProducts,
        progress: enrichedProducts.length
          ? Math.round((countedProducts / enrichedProducts.length) * 100)
          : 0,
        totalUnits,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
