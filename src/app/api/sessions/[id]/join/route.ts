import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDb } from "@/lib/db";
import { apiError } from "@/lib/http";

const joinSchema = z.object({
  name: z.string().trim().min(2, "Ingresa un nombre válido").max(80),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDatabase();
    const { id: sessionId } = await context.params;
    const { name } = joinSchema.parse(await request.json());
    const sql = getDb();

    const [session] = await sql`
      SELECT id FROM inventory_sessions WHERE id = ${sessionId}
    `;
    if (!session) {
      return NextResponse.json({ error: "La sesión no existe" }, { status: 404 });
    }

    let [operator] = await sql`
      SELECT id, name FROM operators WHERE LOWER(name) = LOWER(${name}) LIMIT 1
    `;

    if (!operator) {
      [operator] = await sql`
        INSERT INTO operators (id, name)
        VALUES (${randomUUID()}, ${name})
        RETURNING id, name
      `;
    }

    await sql`
      INSERT INTO session_participants (session_id, operator_id)
      VALUES (${sessionId}, ${operator.id})
      ON CONFLICT (session_id, operator_id)
      DO UPDATE SET last_seen_at = NOW()
    `;

    return NextResponse.json({ operator });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }
    return apiError(error);
  }
}
