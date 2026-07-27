"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { apiFetch } from "@/lib/client";
import {
  ArrowLeft,
  LoaderCircle,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Building2,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ParsedRow = {
  importCode: string;
  palletNumber: string;
  boxNumbers: number[];
  boxRange: string;
};

type ImportResult = {
  created: { imports: number; pallets: number; boxes: number };
  errors: string[];
  total: number;
};

function parseBoxRange(input: string): number[] {
  if (!input.trim()) return [];
  const parts = input.split(",");
  const result: number[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-");
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);
      if (isNaN(start) || isNaN(end) || start < 1 || end < start) continue;
      for (let i = start; i <= end; i++) result.push(i);
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num >= 1) result.push(num);
    }
  }
  return [...new Set(result)].sort((a, b) => a - b);
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const data = [
    { importacion: "IMP-001", pallet: "PAL-01", cajas: "1-10,15,20-30" },
    { importacion: "IMP-001", pallet: "PAL-02", cajas: "1-50" },
    { importacion: "IMP-002", pallet: "PAL-01", cajas: "1,2,3,5,8" },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Estructura");
  XLSX.writeFile(wb, "plantilla_estructura_v4.xlsx");
}

export default function V4ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const totalImports = [...new Set(parsedRows.map((r) => r.importCode))].length;
  const totalPallets = [...new Set(parsedRows.map((r) => `${r.importCode}::${r.palletNumber}`))].length;
  const totalBoxes = parsedRows.reduce((sum, r) => sum + r.boxNumbers.length, 0);

  const handleFile = useCallback(async (file: File) => {
    setParseError("");
    setParsedRows([]);
    setResult(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "buffer" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      const rows: ParsedRow[] = [];

      for (const row of jsonData) {
        const importCode =
          String(row.importacion || row.importCode || row.import || "").trim();
        const palletNumber =
          String(row.pallet || row.palletNumber || row.numero_pallet || "").trim();
        const boxesStr =
          String(row.cajas || row.boxes || row.boxNumbers || "").trim();

        if (!importCode || !palletNumber || !boxesStr) continue;

        const boxNumbers = parseBoxRange(boxesStr);
        if (boxNumbers.length === 0) continue;

        rows.push({ importCode, palletNumber, boxNumbers, boxRange: boxesStr });
      }

      if (rows.length === 0) {
        setParseError("No se encontraron filas válidas. Verifica las columnas: importacion, pallet, cajas");
        return;
      }

      setParsedRows(rows);
    } catch {
      setParseError("Error al leer el archivo. Asegúrate de que sea CSV o Excel (.xlsx/.xls)");
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  async function handleImport() {
    if (parsedRows.length === 0) return;
    setImporting(true);
    try {
      const payload = {
        rows: parsedRows.map((r) => ({
          importCode: r.importCode,
          palletNumber: r.palletNumber,
          boxNumbers: r.boxNumbers,
        })),
      };
      const data = await apiFetch<ImportResult>("/api/sessions/v4/structure/import", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResult(data);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/sessions/v4" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-sm font-bold tracking-tight">Importar estructura</h1>
            <p className="text-[11px] text-slate-400">Importación → Pallet → Cajas</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4 pb-8">
        {/* Step 1: Upload */}
        {!result && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-700">1</span>
                <p className="text-sm font-semibold text-slate-800">Subir archivo</p>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-colors"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Upload size={20} className="text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Arrastra tu archivo aquí
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    o haz clic para seleccionar
                  </p>
                </div>
                <p className="text-[11px] text-slate-400">
                  CSV o Excel (.xlsx, .xls)
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-400">
                  Columnas: importacion, pallet, cajas
                </p>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
                >
                  <FileSpreadsheet size={14} />
                  Descargar plantilla
                </button>
              </div>

              {fileName && parsedRows.length === 0 && !parseError && (
                <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3.5 py-2.5 text-xs text-blue-600">
                  <LoaderCircle className="animate-spin" size={14} />
                  Procesando {fileName}...
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-600">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  {parseError}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Preview */}
        {parsedRows.length > 0 && !result && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-700">2</span>
                <p className="text-sm font-semibold text-slate-800">Vista previa</p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Building2 size={14} className="text-blue-600" />
                    <p className="text-lg font-bold text-blue-700">{totalImports}</p>
                  </div>
                  <p className="text-[11px] text-blue-600">Importaciones</p>
                </div>
                <div className="rounded-xl bg-purple-50 border border-purple-200 px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Package size={14} className="text-purple-600" />
                    <p className="text-lg font-bold text-purple-700">{totalPallets}</p>
                  </div>
                  <p className="text-[11px] text-purple-600">Pallets</p>
                </div>
                <div className="rounded-xl bg-teal-50 border border-teal-200 px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Boxes size={14} className="text-teal-600" />
                    <p className="text-lg font-bold text-teal-700">{totalBoxes}</p>
                  </div>
                  <p className="text-[11px] text-teal-600">Cajas</p>
                </div>
              </div>

              {/* Detail list */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {parsedRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {row.importCode} / {row.palletNumber}
                      </p>
                    </div>
                    <span className="shrink-0 ml-3 inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
                      <Boxes size={12} />
                      {row.boxNumbers.length}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                className="h-12 w-full text-base font-semibold"
                onClick={() => void handleImport()}
                disabled={importing}
              >
                {importing ? (
                  <LoaderCircle className="mr-2 animate-spin" size={18} />
                ) : (
                  <Upload size={18} className="mr-2" />
                )}
                Importar estructura
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Result */}
        {result && (
          <Card className="border-0 shadow-sm border-t-2 border-t-emerald-500">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 size={14} />
                </span>
                <p className="text-sm font-semibold text-slate-800">Importación completada</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-emerald-700">{result.created.imports}</p>
                  <p className="text-[11px] text-emerald-600">Importaciones</p>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-emerald-700">{result.created.pallets}</p>
                  <p className="text-[11px] text-emerald-600">Pallets</p>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-emerald-700">{result.created.boxes}</p>
                  <p className="text-[11px] text-emerald-600">Cajas</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5">
                  <p className="text-xs font-semibold text-red-700 mb-1">
                    Errores ({result.errors.length}):
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-[11px] text-red-600">{err}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-semibold"
                  onClick={() => {
                    setResult(null);
                    setParsedRows([]);
                    setFileName("");
                  }}
                >
                  Importar más
                </Button>
                <Button
                  className="flex-1 h-12 rounded-xl font-semibold"
                  onClick={() => router.push("/sessions/v4/new")}
                >
                  Nueva sesión V4 →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
