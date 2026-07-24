"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client";
import { ArrowLeft, LoaderCircle, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CreateSessionResponse = { session: { id: string } };

export default function NewV3SessionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");

  const create = useCallback(async () => {
    if (!name.trim()) {
      setToast("Ingresa un nombre");
      return;
    }
    setCreating(true);
    setToast("");
    try {
      const result = await apiFetch<CreateSessionResponse>("/api/sessions/v3", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      });
      router.push(`/sessions/v3/${result.session.id}/scan`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al crear");
    } finally {
      setCreating(false);
    }
  }, [name, router]);

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Link href="/sessions/v3" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Nueva sesión V3</h1>
      </div>

      <p className="text-sm text-slate-500">
        Inventario por cajas sin posiciones físicas. Solo necesitas importar la
        estructura de Importación → Pallet → Caja y luego corroborar cantidades.
      </p>

      {toast && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
          {toast}
        </p>
      )}

      <Card>
        <CardContent className="space-y-4 pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nombre de la sesión
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inventario mensual Julio 2026"
              className="h-11"
              onKeyDown={(e) => {
                if (e.key === "Enter") void create();
              }}
              autoFocus
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">Flujo de trabajo</p>
            <ol className="text-sm text-slate-600 space-y-1">
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">1</span>
                Seleccionar Importación → Pallet → Caja
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">2</span>
                Confirmar cantidades de productos
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">3</span>
                Registrar y pasar a revisión
              </li>
            </ol>
          </div>

          <Button
            className="h-12 w-full text-base"
            onClick={() => void create()}
            disabled={creating || !name.trim()}
          >
            {creating ? (
              <LoaderCircle className="mr-2 animate-spin" size={16} />
            ) : (
              <Package size={16} className="mr-2" />
            )}
            Crear sesión V3
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
