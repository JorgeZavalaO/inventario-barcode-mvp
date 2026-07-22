"use client";

import { Trash2, LoaderCircle, AlertTriangle, CheckCircle2, Sparkles, QrCode, Barcode, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LabelFormat } from "@/components/barcode-label";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  active: boolean;
  createdAt: string;
};

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  COUNTER: "Contador",
  VIEWER: "Visor",
};

export default function SettingsPage() {
  const [productCount, setProductCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [defaultFormat, setDefaultFormat] = useState<LabelFormat>(() => {
    if (typeof window === "undefined") return "CODE128";
    return (localStorage.getItem("defaultLabelFormat") as LabelFormat) || "CODE128";
  });

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

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiFetch<{ users: UserRow[] }>("/api/users");
      setUsers(data.users);
    } catch {
      // silent
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => { window.setTimeout(() => void loadUsers(), 0); }, [loadUsers]);

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
      const result = await apiFetch<{ deleted: Record<string, number>; warnings?: string[] }>("/api/admin/reset", { method: "DELETE" });
      const deleted = Object.values(result.deleted).filter((c) => c > 0);
      const skipped = Object.entries(result.deleted).filter(([, c]) => c === -1).map(([k]) => k);
      const total = deleted.reduce((s, c) => s + c, 0);
      const msg = `Sistema reiniciado: ${total} registros eliminados` + (skipped.length > 0 ? `. Tablas ignoradas: ${skipped.join(", ")}` : "");
      setToast(msg);
      if (result.warnings?.length) console.warn("Reset warnings:", result.warnings);
      setConfirmDelete(false);
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Error al reiniciar el sistema");
    } finally {
      setBusy(false);
    }
  }

  function handleFormatChange(format: LabelFormat) {
    setDefaultFormat(format);
    localStorage.setItem("defaultLabelFormat", format);
    setToast(`Formato predeterminado: ${format === "QR" ? "Código QR" : "Código de barras"}`);
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
          <CardTitle className="text-base">Formato de etiquetas</CardTitle>
          <CardDescription>
            Elegí el formato predeterminado para las etiquetas imprimibles. Esta preferencia se guarda en tu navegador y se aplica al generar etiquetas nuevas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleFormatChange("CODE128")}
              className={`flex flex-1 items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                defaultFormat === "CODE128"
                  ? "border-teal-500 bg-teal-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <Barcode size={24} className={defaultFormat === "CODE128" ? "text-teal-600" : "text-slate-400"} />
              <div>
                <p className="font-semibold text-sm text-slate-900">Código de barras (Code 128)</p>
                <p className="text-xs text-slate-500">Formato lineal clásico. Recomendado para etiquetas de 75×50 mm o más grandes.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleFormatChange("QR")}
              className={`flex flex-1 items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                defaultFormat === "QR"
                  ? "border-teal-500 bg-teal-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <QrCode size={24} className={defaultFormat === "QR" ? "text-teal-600" : "text-slate-400"} />
              <div>
                <p className="font-semibold text-sm text-slate-900">Código QR</p>
                <p className="text-xs text-slate-500">Formato matricial con corrección de error. Ideal para etiquetas chicas como 50×25 mm o 75×25 mm.</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuarios y roles</CardTitle>
          <CardDescription>
            {usersLoading ? "Cargando..." : `${users.length} usuario${users.length === 1 ? "" : "s"} registrado${users.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <LoaderCircle className="animate-spin" size={16} /> Cargando usuarios...
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-500">No hay usuarios registrados.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 py-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                    {(user.name ?? user.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {user.name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user.email ?? "—"}</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    <Shield size={12} />
                    {roleLabels[user.role] ?? user.role}
                  </span>
                  {!user.active && (
                    <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                      Inactivo
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

          {productCount !== null && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-red-500" size={20} />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-red-800">Reiniciar sistema</p>
                  <p className="text-xs text-red-600">
                    Borra productos, ubicaciones, sesiones, cajas y operadores. Los usuarios y la configuración se conservan.
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                {!confirmDelete ? (
                  <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} disabled={busy}>
                    <Trash2 size={16} /> Reiniciar sistema
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="destructive" size="sm" onClick={() => void deleteAll()} disabled={busy}>
                      {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      Confirmar reinicio
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
