import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureDatabase, getDb } from "@/lib/db";
import { apiError } from "@/lib/http";

const DEMO_PRODUCTS = [
  ["MANG-001", "7750000000017", "Manguera hidráulica 1/2 pulgada", "MTR", "Mangueras", 24],
  ["TERM-001", "7750000000024", "Terminal JIC hembra 1/2 pulgada", "UND", "Terminales", 40],
  ["ADAP-001", "7750000000031", "Adaptador BSP 1/2 a 3/8", "UND", "Adaptadores", 18],
  ["ABRA-001", "7750000000048", "Abrazadera inoxidable 25 mm", "UND", "Abrazaderas", 75],
  ["ACEI-001", "7750000000055", "Aceite hidráulico ISO 68 - galón", "GLN", "Lubricantes", 12],
];

export async function POST() {
  try {
    await ensureDatabase();
    const sql = getDb();
    const [{ count }] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM products
    `;

    if (count === 0) {
      for (const [code, barcode, description, unit, category, stock] of DEMO_PRODUCTS) {
        await sql`
          INSERT INTO products (
            id, code, barcode, description, unit, category, theoretical_stock
          ) VALUES (
            ${randomUUID()}, ${String(code)}, ${String(barcode)}, ${String(description)},
            ${String(unit)}, ${String(category)}, ${Number(stock)}
          )
          ON CONFLICT (code) DO NOTHING
        `;
      }
    }

    return NextResponse.json({ ok: true, seeded: count === 0 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE() {
  try {
    await ensureDatabase();
    const sql = getDb();

    await sql`DELETE FROM count_events`;
    await sql`DELETE FROM session_participants`;
    await sql`DELETE FROM session_products`;
    await sql`DELETE FROM inventory_sessions`;
    await sql`DELETE FROM operators`;
    await sql`DELETE FROM products`;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
