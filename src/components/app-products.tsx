"use client";

import Link from "next/link";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Barcode,
  Boxes,
  FileSpreadsheet,
  LoaderCircle,
  PackagePlus,
  Plus,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiFetch } from "@/lib/client";
import type { Product } from "@/lib/types";
import { ImportProgress } from "@/components/import-progress";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const initialProduct = {
  code: "",
  barcode: "",
  description: "",
  unit: "UND",
  category: "",
  theoreticalStock: "0",
};

export function AppProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [productForm, setProductForm] = useState(initialProduct);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importProducts, setImportProducts] = useState<
    | { code: string; barcode?: string; description: string; unit?: string; category?: string; theoreticalStock?: number }[]
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ products: Product[] }>("/api/products");
      setProducts(data.products);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudieron cargar los productos",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.setTimeout(() => void load(), 0);
  }, [load]);

  const [page, setPage] = useState(1);
  const perPage = 15;

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [
        product.code,
        product.barcode ?? "",
        product.description,
        product.category ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [products, search]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / perPage));
  const paginated = filteredProducts.slice(
    (page - 1) * perPage,
    page * perPage,
  );

  function goToPage(p: number) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function renderPageNumbers() {
    const pages: React.ReactNode[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(
        <PaginationItem key="1">
          <PaginationLink onClick={() => goToPage(1)} href="#">1</PaginationLink>
        </PaginationItem>,
      );
      if (start > 2) pages.push(<PaginationItem key="e1"><PaginationEllipsis /></PaginationItem>);
    }
    for (let i = start; i <= end; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={i === page} onClick={() => goToPage(i)} href="#">{i}</PaginationLink>
        </PaginationItem>,
      );
    }
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(<PaginationItem key="e2"><PaginationEllipsis /></PaginationItem>);
      pages.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => goToPage(totalPages)} href="#">{totalPages}</PaginationLink>
        </PaginationItem>,
      );
    }
    return pages;
  }

  async function createProduct(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/products", {
        method: "POST",
        body: JSON.stringify({
          ...productForm,
          theoreticalStock: Number(productForm.theoreticalStock || 0),
        }),
      });
      setProductForm(initialProduct);
      setMessage("Producto registrado correctamente");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo registrar el producto",
      );
    } finally {
      setBusy(false);
    }
  }

  async function importFile(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    let rows: Record<string, string>[] = [];

    if (extension === "csv") {
      const text = await file.text();
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      if (parsed.errors.length) {
        setError(`El CSV tiene errores: ${parsed.errors[0]?.message}`);
        return;
      }
      rows = parsed.data;
    } else if (extension === "xlsx" || extension === "xls") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        setError("El archivo Excel no contiene hojas.");
        return;
      }
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<
        Record<string, string | number | undefined>
      >(sheet, { defval: "" });
      rows = json.map((row) => {
        const lower: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
          lower[key.trim().toLowerCase()] = String(value ?? "").trim();
        }
        return lower;
      });
    } else {
      setError("Formato no soportado. Usá archivos .csv o .xlsx.");
      return;
    }

    const normalized = rows
      .map((row) => {
        const lower: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
          lower[key.trim().toLowerCase()] = String(value ?? "").trim();
        }
        return {
          code: lower.codigo || lower.code || lower.sku || "",
          barcode:
            lower.codigo_barra ||
            lower["codigo de barras"] ||
            lower.barcode ||
            lower.ean ||
            "",
          description:
            lower.descripcion || lower.description || lower.producto || "",
          unit: lower.unidad || lower.unit || "UND",
          category: lower.categoria || lower.category || "",
          theoreticalStock: Number(
            lower.stock_teorico ||
              lower.stock ||
              lower.theoreticalstock ||
              lower.existencia ||
              0,
          ),
        };
      })
      .filter((row) => row.code && row.description);

    if (!normalized.length) {
      setError("No se encontraron filas válidas.");
      return;
    }

    setImportProducts(normalized);
  }
  async function seedDemo() {
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/setup", {
        method: "POST",
        body: JSON.stringify({ seedDemo: true }),
      });
      setMessage("Productos demo cargados");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo cargar demo",
      );
    } finally {
      setBusy(false);
    }
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const data = [
      {
        codigo: "PROD-001",
        codigo_barra: "7751234567890",
        descripcion: "Producto de ejemplo",
        unidad: "UND",
        categoria: "Categoría",
        stock_teorico: 25,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "plantilla_productos.xlsx");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
          <p className="text-sm text-slate-500">
            Catálogo de productos y stock teórico.
          </p>
        </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <FileSpreadsheet size={16} /> Plantilla
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} /> Importar CSV / Excel
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
                e.target.value = "";
              }}
            />
          </Button>
          {products.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void seedDemo()}
              disabled={busy}
            >
              <Sparkles size={16} /> Demo
            </Button>
          )}
        </div>
      </div>

      {(error || message) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {error || message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                <PackagePlus size={19} />
              </span>
              <div>
                <CardTitle className="text-base">Registrar producto</CardTitle>
                <CardDescription>
                  Si dejas vacío el barcode, se usará el código interno.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={createProduct}
              className="grid gap-3 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="p-code">Código</Label>
                <Input
                  id="p-code"
                  value={productForm.code}
                  onChange={(e) =>
                    setProductForm({ ...productForm, code: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-barcode">Código de barras</Label>
                <Input
                  id="p-barcode"
                  value={productForm.barcode}
                  onChange={(e) =>
                    setProductForm({ ...productForm, barcode: e.target.value })
                  }
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-desc">Descripción</Label>
                <Input
                  id="p-desc"
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      description: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-unit">Unidad</Label>
                <Input
                  id="p-unit"
                  value={productForm.unit}
                  onChange={(e) =>
                    setProductForm({ ...productForm, unit: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-cat">Categoría</Label>
                <Input
                  id="p-cat"
                  value={productForm.category}
                  onChange={(e) =>
                    setProductForm({ ...productForm, category: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="p-stock">Stock teórico</Label>
                <Input
                  id="p-stock"
                  type="number"
                  min="0"
                  step="0.001"
                  value={productForm.theoreticalStock}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      theoreticalStock: e.target.value,
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full" disabled={busy}>
                  <Plus size={18} /> Guardar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 p-5">
            <div className="relative max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
              />
              <Input
                className="pl-10"
                placeholder="Buscar código, descripción o categoría"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-12 text-center text-sm text-slate-500"
                    >
                      <LoaderCircle
                        className="mx-auto mb-2 animate-spin"
                        size={24}
                      />
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : paginated.length > 0 ? (
                  paginated.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <p className="font-semibold text-slate-900">
                          {product.description}
                        </p>
                        <p className="mt-1 font-mono text-xs text-slate-500">
                          {product.code} · {product.category || "Sin categoría"}
                        </p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Barcode size={14} /> {product.barcode || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums font-semibold">
                        {product.theoretical_stock.toLocaleString("es-PE")}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          {product.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <Link href={`/products/${product.id}/label`} />
                          }
                        >
                          Etiqueta
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-14 text-center text-sm text-slate-500"
                    >
                      <Boxes
                        className="mx-auto mb-2 text-slate-300"
                        size={30}
                      />
                      {search ? "No se encontraron productos." : "No hay productos."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && totalPages > 1 && (
            <div className="border-t border-slate-200 px-4 py-3">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => goToPage(page - 1)}
                      href="#"
                      text="Anterior"
                      className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                    />
                  </PaginationItem>
                  {renderPageNumbers()}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => goToPage(page + 1)}
                      href="#"
                      text="Siguiente"
                      className={page >= totalPages ? "pointer-events-none opacity-40" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
          <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
            <FileSpreadsheet className="mt-0.5 shrink-0" size={16} />
            CSV o Excel: columnas <span className="font-mono">
              codigo
            </span>, <span className="font-mono">codigo_barra</span>,{" "}
            <span className="font-mono">descripcion</span>,{" "}
            <span className="font-mono">unidad</span>,{" "}
            <span className="font-mono">categoria</span>,{" "}
            <span className="font-mono">stock_teorico</span> · Máximo 6500 filas
            por lote
          </div>
        </Card>
      </div>
      {importProducts && (
        <ImportProgress
          products={importProducts}
          onClose={() => setImportProducts(null)}
          onComplete={() => { void load(); }}
        />
      )}
    </div>
  );
}
