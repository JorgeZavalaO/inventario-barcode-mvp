"use client";

import { ArrowRight, ClipboardList } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function EmptyState({
  sessionId,
  type = "no-session",
}: {
  sessionId?: string;
  type?: "no-session" | "closed" | "no-operator";
}) {
  if (type === "closed") {
    return (
      <Card className="p-8 text-center">
        <ClipboardList className="mx-auto mb-3 text-slate-300" size={48} />
        <h2 className="text-xl font-bold">Sesión cerrada</h2>
        <p className="mt-2 text-sm text-slate-500">
          Esta sesión ya fue cerrada. No se pueden registrar más conteos.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" render={<Link href="/sessions" />}>
            Volver a sesiones
          </Button>
        </div>
      </Card>
    );
  }

  if (type === "no-operator") {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-bold">Identifícate para continuar</h2>
        <p className="mt-2 text-sm text-slate-500">
          Debes ingresar tu nombre para participar en esta sesión.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-8 text-center">
      <ClipboardList className="mx-auto mb-3 text-slate-300" size={48} />
      <h2 className="text-xl font-bold">Sin sesión activa</h2>
      <p className="mt-2 text-sm text-slate-500">
        Necesitas una sesión activa para escanear productos.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button render={<Link href={sessionId ? `/sessions/${sessionId}` : "/sessions"} />}>
          Ir a la sesión <ArrowRight size={16} />
        </Button>
      </div>
    </Card>
  );
}
