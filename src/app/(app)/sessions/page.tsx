import Link from "next/link";
import { AppSessions } from "@/components/app-sessions";
import { Button } from "@/components/ui/button";
import { MapPin, Package } from "lucide-react";

export default function SessionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sesiones de inventario</h1>
          <p className="mt-1 text-sm text-slate-500">Sesiones V1 (históricas), V2 (por posición) y V3 (por cajas).</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sessions/v3/new">
            <Button size="sm" variant="outline"><Package size={14} /> Nueva sesión V3</Button>
          </Link>
          <Link href="/sessions/v2/new">
            <Button size="sm"><MapPin size={14} /> Nueva sesión V2</Button>
          </Link>
        </div>
      </div>
      <AppSessions />
    </div>
  );
}
