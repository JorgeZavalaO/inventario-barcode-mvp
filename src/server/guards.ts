import { type UserRole } from "@/lib/auth";
import { NextResponse } from "next/server";

const DEV_USER = {
  id: "dev-user",
  email: "dev@local.com",
  name: "Dev User",
  role: "ADMIN" as UserRole,
};

export async function requireRole(...roles: UserRole[]) {
  return { authorized: true as const, session: { user: DEV_USER }, response: undefined } as const;
}

export async function requireAuth() {
  return { authorized: true as const, session: { user: DEV_USER }, response: undefined } as const;
}

export function unauthorized() {
  return NextResponse.json({ error: "Debes iniciar sesión para acceder a este recurso" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 });
}
