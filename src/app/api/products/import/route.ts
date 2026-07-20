import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDb } from "@/lib/db";
import { apiError } from "@/lib/http";

const importSchema = z.object({
  products: z.array(
    z.object({
      code: z.string().trim().min(1),
      barcode: z.string().trim().optional(),
      description: z.string().trim().min(1),
      unit: z.string().trim().optional(),
      category: z.string().trim().optional(),
      theoreticalStock: z.coerce.number().min(0).optional(),
    }),
  ).min(1).max(5000),
});

export async function POST(request: NextRequest) {
  try {
    await ensureDatabase();
    const { products } = importSchema.parse(await request.json());
    const sql = getDb();
    let imported = 0;
    const errors: string[] = [];

    for (const [index, product] of products.entries()) {
      try {
        await sql`
          INSERT INTO products (
            id, code, barcode, description, unit, category, theoretical_stock
          ) VALUES (
            ${randomUUID()}, ${product.code}, ${product.barcode || product.code},
            ${product.description}, ${product.unit || "UND"}, ${product.category || null},
            ${product.theoreticalStock ?? 0}
          )
          ON CONFLICT (code) DO UPDATE SET
            barcode = EXCLUDED.barcode,
            description = EXCLUDED.description,
            unit = EXCLUDED.unit,
            category = EXCLUDED.category,
            theoretical_stock = EXCLUDED.theoretical_stock,
            active = TRUE,
            updated_at = NOW()
        `;
        imported += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        errors.push(`Fila ${index + 2} (${product.code}): ${message}`);
      }
    }

    return NextResponse.json({ imported, errors });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return apiError(error);
  }
}
