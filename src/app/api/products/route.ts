import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDb } from "@/lib/db";
import { apiError } from "@/lib/http";

const productSchema = z.object({
  code: z.string().trim().min(1, "El código es obligatorio").max(80),
  barcode: z.string().trim().max(120).optional(),
  description: z.string().trim().min(2, "La descripción es obligatoria").max(240),
  unit: z.string().trim().min(1).max(20).default("UND"),
  category: z.string().trim().max(100).optional(),
  theoreticalStock: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    await ensureDatabase();
    const sql = getDb();
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const idsParam = request.nextUrl.searchParams.get("ids")?.trim() ?? "";
    const pattern = `%${search}%`;

    const ids = idsParam
      ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const products = ids.length > 0
      ? await sql`
          SELECT
            id, code, barcode, description, unit, category,
            theoretical_stock::float8 AS theoretical_stock,
            active
          FROM products
          WHERE id = ANY(${ids}::text[])
          ORDER BY description ASC
        `
      : await sql`
          SELECT
            id, code, barcode, description, unit, category,
            theoretical_stock::float8 AS theoretical_stock,
            active
          FROM products
          WHERE active = TRUE
            AND (
              ${search} = '' OR code ILIKE ${pattern} OR barcode ILIKE ${pattern}
              OR description ILIKE ${pattern} OR COALESCE(category, '') ILIKE ${pattern}
            )
          ORDER BY description ASC
        `;

    return NextResponse.json({ products });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const body = productSchema.parse(await request.json());
    const sql = getDb();
    const id = randomUUID();
    const barcode = body.barcode || null;

    const [product] = await sql`
      INSERT INTO products (
        id, code, barcode, description, unit, category, theoretical_stock,
        created_at, updated_at
      ) VALUES (
        ${id}, ${body.code}, ${barcode}, ${body.description}, ${body.unit},
        ${body.category || null}, ${body.theoreticalStock},
        NOW(), NOW()
      )
      RETURNING
        id, code, barcode, description, unit, category,
        theoretical_stock::float8 AS theoretical_stock,
        active
    `;

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return apiError(error);
  }
}
