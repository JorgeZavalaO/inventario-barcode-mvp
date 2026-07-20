import { NextResponse } from "next/server";

export function apiError(error: unknown, fallback = "Ocurrió un error inesperado") {
  console.error(error);

  const message = error instanceof Error ? error.message : fallback;
  const pgCode =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  if (pgCode === "23505") {
    return NextResponse.json(
      { error: "El código o código de barras ya se encuentra registrado." },
      { status: 409 },
    );
  }

  return NextResponse.json({ error: message || fallback }, { status: 500 });
}
