import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureDatabase, getDb } from "@/lib/db";
import { apiError } from "@/lib/http";
import { requireRole, requireAuth } from "@/server/guards";

const schema = z.object({
  reason: z.string().trim().min(5, "Debes proporcionar un motivo (mín 5 caracteres)").max(500),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole("SUPERVISOR", "ADMIN", "COUNTER");
    if (!auth.authorized) return auth.response;
    const userId = auth.session!.user.id;

    const { id } = await context.params;
    const body = schema.parse(await request.json());

    await ensureDatabase();
    const sql = getDb();

    const [event] = await sql`
      SELECT id, operator_id, created_at FROM count_events WHERE id = ${id}
    `;
    if (!event) {
      return NextResponse.json({ error: "El conteo no existe" }, { status: 404 });
    }
    if (event.reversed_at) {
      return NextResponse.json({ error: "El conteo ya fue anulado" }, { status: 400 });
    }

    const isAuthor = event.operator_id === userId;
    const isSupervisor = auth.session!.user.role === "SUPERVISOR" || auth.session!.user.role === "ADMIN";
    const withinWindow = (Date.now() - new Date(event.created_at).getTime()) < 30 * 60 * 1000;

    if (!isSupervisor && !isAuthor) {
      return NextResponse.json({ error: "Solo el autor o un supervisor pueden anular este conteo" }, { status: 403 });
    }
    if (!isSupervisor && !withinWindow) {
      return NextResponse.json({ error: "Ventana de anulación expirada (30 min). Solicita a un supervisor." }, { status: 400 });
    }

    const [updated] = await sql`
      UPDATE count_events
      SET reversed_at = NOW(), reversed_by_id = ${userId}, reversal_reason = ${body.reason}
      WHERE id = ${id} AND reversed_at IS NULL
      RETURNING id, reversed_at, reversed_by_id, reversal_reason
    `;

    console.log(`[AUDIT] Reverse count ${id} by user ${userId} reason: ${body.reason}`);

    return NextResponse.json({ event: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    return apiError(error);
  }
}
