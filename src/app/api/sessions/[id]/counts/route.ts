import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDb } from "@/lib/db";
import { apiError } from "@/lib/http";

const countSchema = z.object({
  code: z.string().trim().min(1, "Escanea o ingresa un código"),
  quantity: z.coerce.number().positive().max(999999),
  operatorId: z.string().uuid(),
  operationId: z.string().uuid(),
  inputMethod: z.enum(["CAMERA", "MANUAL", "USB"]).default("CAMERA"),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDatabase();
    const { id: sessionId } = await context.params;
    const body = countSchema.parse(await request.json());
    const sql = getDb();

    const result = await sql.begin(async (transaction) => {
      const [duplicate] = await transaction`
        SELECT id FROM count_events WHERE operation_id = ${body.operationId}
      `;
      if (duplicate) {
        return { duplicate: true, eventId: duplicate.id };
      }

      const [session] = await transaction`
        SELECT id, status FROM inventory_sessions WHERE id = ${sessionId} FOR UPDATE
      `;
      if (!session) throw new Error("La sesión no existe");
      if (session.status !== "OPEN") throw new Error("La sesión está cerrada o pausada");

      const [operator] = await transaction`
        SELECT id FROM operators WHERE id = ${body.operatorId}
      `;
      if (!operator) throw new Error("Debes identificarte antes de contar");

      const [product] = await transaction`
        SELECT id, code, barcode, description, unit, theoretical_stock::float8 AS theoretical_stock
        FROM products
        WHERE active = TRUE AND (barcode = ${body.code} OR code = ${body.code})
        LIMIT 1
      `;
      if (!product) throw new Error(`No se encontró un producto con el código ${body.code}`);

      await transaction`
        INSERT INTO session_products (session_id, product_id, theoretical_stock)
        VALUES (${sessionId}, ${product.id}, ${product.theoretical_stock})
        ON CONFLICT (session_id, product_id) DO NOTHING
      `;

      const eventId = randomUUID();
      await transaction`
        INSERT INTO count_events (
          id, operation_id, session_id, product_id, operator_id, quantity, input_method
        ) VALUES (
          ${eventId}, ${body.operationId}, ${sessionId}, ${product.id}, ${body.operatorId},
          ${body.quantity}, ${body.inputMethod}
        )
      `;

      await transaction`
        INSERT INTO session_participants (session_id, operator_id)
        VALUES (${sessionId}, ${body.operatorId})
        ON CONFLICT (session_id, operator_id)
        DO UPDATE SET last_seen_at = NOW()
      `;

      const [{ total }] = await transaction`
        SELECT COALESCE(SUM(quantity) FILTER (WHERE reversed_at IS NULL), 0)::float8 AS total
        FROM count_events
        WHERE session_id = ${sessionId} AND product_id = ${product.id}
      `;

      return { duplicate: false, eventId, product, total };
    });

    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    if (error instanceof Error && /no existe|cerrada|pausada|identificarte|No se encontró/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiError(error);
  }
}
