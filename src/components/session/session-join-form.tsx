"use client";

import { FormEvent, useState } from "react";
import { LoaderCircle, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export function SessionJoinForm({
  onSubmit,
  sending,
}: {
  onSubmit: (name: string) => void;
  sending: boolean;
}) {
  const [name, setName] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim()) await onSubmit(name.trim());
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md p-6 shadow-2xl sm:p-8">
        <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700">
          <UserRound size={24} />
        </span>
        <h2 className="text-2xl font-bold">Identifícate para contar</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Tu nombre quedará registrado en cada lectura. Puedes usar esta misma sesión desde varios celulares.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-name">Nombre del participante</Label>
            <Input
              id="join-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Jorge"
              autoFocus
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={sending || !name.trim()}>
            {sending ? <LoaderCircle className="animate-spin" size={18} /> : <UserRound size={18} />}
            Ingresar a la sesión
          </Button>
        </form>
      </Card>
    </div>
  );
}
