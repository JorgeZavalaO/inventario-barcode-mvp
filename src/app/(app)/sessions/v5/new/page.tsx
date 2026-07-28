"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, ScanBarcode } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CreateSessionResponse = { session: { id: string } };

export default function NewV5SessionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const create = useCallback(async () => {
    if (!name.trim()) {
      setError("Ingresa un nombre para la sesión");
      return;
    }

    setCreating(true);
    setError("");
    try {
      const result = await apiFetch<CreateSessionResponse>("/api/sessions/v5", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      router.push(`/sessions/v5/${result.session.id}/scan`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la sesión");
    } finally {
      setCreating(false);
    }
  }, [name, router]);

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Link href="/sessions/v5" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Nueva sesión V5</h1>
      </div>

      <p className="text-sm text-slate-500">
        Captura rápida independiente. Ingresa el código del producto, registra cajas y unidades por caja, y el sistema calculará el total.
      </p>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div>
            <label htmlFor="v5-session-name" className="mb-1 block text-sm font-medium text-slate-700">
              Nombre de la sesión
            </label>
            <Input
              id="v5-session-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Captura rápida Julio 2026"
              className="h-11"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") void create();
              }}
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-700">Cómo funciona</p>
            <ol className="mt-2 space-y-1.5">
              <li>1. El operador se identifica al ingresar.</li>
              <li>2. Busca el producto por código o código de barras.</li>
              <li>3. Registra cajas y unidades por caja.</li>
              <li>4. El total queda guardado en el historial.</li>
            </ol>
          </div>

          <Button className="h-12 w-full text-base" onClick={() => void create()} disabled={creating || !name.trim()}>
            {creating ? <LoaderCircle className="mr-2 animate-spin" size={17} /> : <ScanBarcode className="mr-2" size={17} />}
            Crear sesión V5
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
