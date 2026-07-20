"use client";

import { Trash2, LoaderCircle, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const router = useRouter();
  const [productCount, setProductCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ products: unknown[] }>("/api/products");
      setProductCount(data.products.length);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { window.setTimeout(() => void load(), 0); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function seedDemo() {
    setBusy(true);
    try {
      await apiFetch("/api/setup", { method: "POST", body: "{}" });
      setToast("Datos demo cargados");
      await load();
    } catch {
      setToast("Error al cargar datos demo");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAll() {
    setBusy(true);
    try {
      await apiFetch("/api/setup", { method: "DELETE" });
      setToast("Todos los datos fueron eliminados");
      setConfirmDelete(false);
      await load();
    } catch {
      setToast("Error al eliminar datos");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-slate-500">Administración del sistema.</p>
      </div>

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del sistema</CardTitle>
          <CardDescription>
            {loading
              ? "Verificando..."
              : productCount !== null
                ? `${productCount} producto${productCount === 1 ? "" : "s"} en el catálogo`
                : "No se pudo obtener el estado"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {productCount === 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Sparkles className="text-slate-500" size={20} />
              <div className="flex-1">
                <p className="font-semibold text-sm">Catálogo vacío</p>
                <p className="text-xs text-slate-500">Cargá productos demo o importá tu propio CSV/Excel.</p>
              </div>
              <Button size="sm" onClick={() => void seedDemo()} disabled={busy}>
                {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
                Cargar demo
              </Button>
            </div>
          )}

          {productCount !== null && productCount > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-red-500" size={20} />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-red-800">Zona peligrosa</p>
                  <p className="text-xs text-red-600">
                    Borrar todos los datos elimina productos, sesiones, conteos y operadores. Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                {!confirmDelete ? (
                  <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} disabled={busy}>
                    <Trash2 size={16} /> Borrar todos los datos
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="destructive" size="sm" onClick={() => void deleteAll()} disabled={busy}>
                      {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      Confirmar borrado
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={busy}>
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
