"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Filtrar...",
  disabled = false,
  className,
  emptyMessage = "Sin resultados",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const sorted = [...options].sort((a, b) =>
      a.label.localeCompare(b.label, "es", { numeric: true, sensitivity: "base" }),
    );
    if (!search.trim()) return sorted;
    const term = search.toLowerCase();
    return sorted.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, search]);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  function handleInputFocus() {
    if (!open) setOpen(true);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(!open); setSearch(""); } }}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition-colors",
          "hover:border-slate-300 focus:border-teal-500 focus:outline-none",
          disabled && "cursor-not-allowed opacity-50",
          !selectedLabel && "text-slate-400"
        )}
      >
        <span className="min-w-0 whitespace-normal break-words leading-5">{selectedLabel || placeholder}</span>
        <ChevronDown size={14} className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center border-b border-slate-100 px-2">
            <Search size={14} className="shrink-0 text-slate-400" />
             <input
               ref={inputRef}
               type="text"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               onFocus={handleInputFocus}
               placeholder={searchPlaceholder}
               aria-label={searchPlaceholder}
               autoComplete="off"
               className="h-9 w-full bg-transparent px-2 text-sm outline-none placeholder:text-slate-400"
             />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-center text-xs text-slate-400">{emptyMessage}</li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); setSearch(""); }}
                    className={cn(
                      "w-full whitespace-normal break-words px-3 py-2 text-left text-sm leading-5 transition-colors hover:bg-slate-50",
                      opt.value === value && "bg-teal-50 font-medium text-teal-700"
                    )}
                  >
                    {opt.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
