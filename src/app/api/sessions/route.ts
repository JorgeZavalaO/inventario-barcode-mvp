import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDb } from "@/lib/db";
import { apiError } from "@/lib/http";

const sessionSchema = z.object({
  name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(120),
  warehouse: z.string().trim().min(2).max(120).default("Almacén principal"),
});

function sessionCode() {
  return `INV-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function GET() {
  try {
    await ensureDatabase();
    const sql = getDb();
    const sessions = await sql`
      SELECT
        s.id, s.code, s.name, s.warehouse, s.status, s.created_at, s.closed_at,
        COALESCE(product_summary.product_count, 0)::int AS product_count,
        COALESCE(count_summary.counted_products, 0)::int AS counted_products,
        COALESCE(count_summary.total_units, 0)::float8 AS total_units
      FROM inventory_sessions s
      LEFT JOIN (
        SELECT session_id, COUNT(*)::int AS product_count
        FROM session_products
        GROUP BY session_id
      ) product_summary ON product_summary.session_id = s.id
      LEFT JOIN (
        SELECT
          session_id,
          COUNT(DISTINCT product_id) FILTER (WHERE reversed_at IS NULL)::int AS counted_products,
          COALESCE(SUM(quantity) FILTER (WHERE reversed_at IS NULL), 0)::float8 AS total_units
        FROM count_events
        GROUP BY session_id
      ) count_summary ON count_summary.session_id = s.id
      ORDER BY CASE WHEN s.status = 'OPEN' THEN 0 ELSE 1 END, s.created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ sessions });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const body = sessionSchema.parse(await request.json());
    const sql = getDb();
    const id = randomUUID();
    let code = sessionCode();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const [existing] = await sql`SELECT id FROM inventory_sessions WHERE code = ${code}`;
      if (!existing) break;
      code = sessionCode();
    }

    const session = await sql.begin(async (transaction) => {
      const [created] = await transaction`
        INSERT INTO inventory_sessions (id, code, name, warehouse)
        VALUES (${id}, ${code}, ${body.name}, ${body.warehouse})
        RETURNING id, code, name, warehouse, status, created_at, closed_at
      `;

      await transaction`
        INSERT INTO session_products (session_id, product_id, theoretical_stock)
        SELECT ${id}, id, theoretical_stock
        FROM products
        WHERE active = TRUE
        ON CONFLICT DO NOTHING
      `;

      return created;
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return apiError(error);
  }
}
