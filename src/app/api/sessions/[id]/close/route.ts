import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase, getDb } from "@/lib/db";
import { apiError } from "@/lib/http";
import { requireRole } from "@/server/guards";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN");
    if (!auth.authorized) return auth.response;

    await ensureDatabase();
    const { id } = await context.params;
    const sql = getDb();
    const [session] = await sql`
      UPDATE inventory_sessions
      SET status = 'CLOSED', closed_at = NOW()
      WHERE id = ${id} AND status <> 'CLOSED'
      RETURNING id, code, name, warehouse, status, created_at, closed_at
    `;

    if (!session) {
      return NextResponse.json({ error: "La sesión ya está cerrada o no existe" }, { status: 400 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    return apiError(error);
  }
}
