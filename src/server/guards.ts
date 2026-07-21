import { auth, type UserRole } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Require the authenticated user to have at least one of the specified roles.
 * Returns the session if authorized, or a 403 response.
 */
export async function requireRole(...roles: UserRole[]) {
  const session = await auth();
  if (!session?.user) {
    return { authorized: false, session: null, response: unauthorized() } as const;
  }

  const userRole = session.user.role;
  if (!roles.includes(userRole)) {
    return { authorized: false, session, response: forbidden() } as const;
  }

  return { authorized: true, session, response: null } as const;
}

/**
 * Require the user to be authenticated (any role).
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return { authorized: false, session: null, response: unauthorized() } as const;
  }
  return { authorized: true, session, response: null } as const;
}

export function unauthorized() {
  return NextResponse.json({ error: "Debes iniciar sesión para acceder a este recurso" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "No tienes permisos para realizar esta acción" }, { status: 403 });
}
