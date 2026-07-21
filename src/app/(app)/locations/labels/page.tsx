"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client";
import { Printer, LoaderCircle, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationLabel, type LocationData } from "@/components/locations/location-label";

export default function LocationLabelsPage() {
  const [labels, setLabels] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [filteredLabels, setFilteredLabels] = useState<LocationData[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ labels: LocationData[] }>("/api/positions/labels");
      setLabels(data.labels);
      setFilteredLabels(data.labels);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!searchCode.trim()) { setFilteredLabels(labels); return; }
    const q = searchCode.toLowerCase();
    setFilteredLabels(labels.filter((l) => l.code.toLowerCase().includes(q)));
  }, [searchCode, labels]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Etiquetas de ubicación</h1>
          <p className="mt-1 text-sm text-slate-500">QR + código legible para posiciones físicas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => void load()} variant="outline" size="sm" disabled={loading}>
            {loading ? <LoaderCircle className="animate-spin" size={14} /> : <Search size={14} />} Cargar
          </Button>
          <Button onClick={handlePrint} size="sm"><Printer size={14} /> Imprimir</Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por código de ubicación..."
          value={searchCode}
          onChange={(e) => setSearchCode(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-xs text-slate-400">{filteredLabels.length} de {labels.length}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <LoaderCircle className="mr-2 animate-spin" size={20} /> Cargando etiquetas...
        </div>
      ) : filteredLabels.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-slate-400">
          {labels.length === 0 ? "No hay posiciones registradas. Crea posiciones desde el diseñador de racks." : "Ninguna ubicación coincide con la búsqueda."}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 print:grid-cols-3">
          {filteredLabels.map((loc) => (
            <LocationLabel key={loc.id} location={loc} size="sm" />
          ))}
        </div>
      )}

      <style jsx global>{`
        @media print {
          nav, header, .sidebar, button, input { display: none !important; }
          body { margin: 0; padding: 10px; }
        }
      `}</style>
    </div>
  );
}
