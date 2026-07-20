import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase, getDb } from "@/lib/db";
import { apiError } from "@/lib/http";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureDatabase();
    const { id } = await context.params;
    const sql = getDb();
    const [event] = await sql`
      UPDATE count_events
      SET reversed_at = NOW()
      WHERE id = ${id} AND reversed_at IS NULL
      RETURNING id, reversed_at
    `;

    if (!event) {
      return NextResponse.json({ error: "El conteo ya fue anulado o no existe" }, { status: 400 });
    }

    return NextResponse.json({ event });
  } catch (error) {
    return apiError(error);
  }
}
