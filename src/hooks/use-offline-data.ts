"use client";

import { useCallback, useEffect, useState } from "react";
import {
  offlineStore,
  type OfflineProduct,
  type OfflineImport,
  type OfflinePallet,
  type OfflineBox,
  type OfflineBoxProduct,
  type OfflineOperator,
} from "@/lib/offline-store";

export type OfflineDataState = {
  products: OfflineProduct[];
  imports: OfflineImport[];
  pallets: OfflinePallet[];
  boxes: OfflineBox[];
  boxProducts: OfflineBoxProduct[];
  operators: OfflineOperator[];
  loading: boolean;
  syncing: boolean;
  lastSync: string | null;
  isOnline: boolean;
  counts: { products: number; imports: number; pallets: number; boxes: number };
};

export function useOfflineData() {
  const [state, setState] = useState<OfflineDataState>({
    products: [],
    imports: [],
    pallets: [],
    boxes: [],
    boxProducts: [],
    operators: [],
    loading: true,
    syncing: false,
    lastSync: null,
    isOnline: true,
    counts: { products: 0, imports: 0, pallets: 0, boxes: 0 },
  });

  const loadFromCache = useCallback(async () => {
    try {
      const [products, imports, pallets, boxes, boxProducts, operators, meta] = await Promise.all([
        offlineStore.getAll<OfflineProduct>("products"),
        offlineStore.getAll<OfflineImport>("imports"),
        offlineStore.getAll<OfflinePallet>("pallets"),
        offlineStore.getAll<OfflineBox>("boxes"),
        offlineStore.getAll<OfflineBoxProduct>("boxProducts"),
        offlineStore.getAll<OfflineOperator>("operators"),
        offlineStore.getSyncMeta("full-sync"),
      ]);

      setState((prev) => ({
        ...prev,
        products,
        imports,
        pallets,
        boxes,
         boxProducts,
         operators,
        loading: false,
        lastSync: meta?.lastSync ?? null,
        counts: {
          products: products.length,
          imports: imports.length,
          pallets: pallets.length,
          boxes: boxes.length,
        },
      }));
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    setState((prev) => ({ ...prev, isOnline: navigator.onLine }));
    const onOnline = () => setState((prev) => ({ ...prev, isOnline: true }));
    const onOffline = () => setState((prev) => ({ ...prev, isOnline: false }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void loadFromCache();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [loadFromCache]);

  const syncData = useCallback(async () => {
    if (!navigator.onLine) return;
    setState((prev) => ({ ...prev, syncing: true }));

    try {
      const resp = await fetch("/api/offline/sync", { credentials: "include" });
      if (!resp.ok) throw new Error("Error al sincronizar");
      const data = await resp.json();
      const operators = data.operators ?? [];
      const sessions = data.sessions ?? [];
      localStorage.setItem("stockscan_sessions_v3", JSON.stringify(sessions));

      await Promise.all([
        offlineStore.replaceAll("products", data.products),
        offlineStore.replaceAll("imports", data.imports),
        offlineStore.replaceAll("pallets", data.pallets),
        offlineStore.replaceAll("boxes", data.boxes),
        offlineStore.replaceAll("boxProducts", data.boxProducts),
        offlineStore.replaceAll("operators", operators),
      ]);

      const totalItems = data.products.length + data.imports.length + data.pallets.length + data.boxes.length + data.boxProducts.length + operators.length;
      await offlineStore.updateSyncMeta("full-sync", totalItems);

      await loadFromCache();
      window.dispatchEvent(new CustomEvent("offline-data-synced"));
    } catch (error) {
      console.error("[OfflineData] Sync failed:", error);
      throw error;
    } finally {
      setState((prev) => ({ ...prev, syncing: false }));
    }
  }, [loadFromCache]);

  const getImports = useCallback(async () => {
    return state.imports;
  }, [state.imports]);

  const getPalletsByImport = useCallback(async (importId: string) => {
    return state.pallets.filter((p) => p.importId === importId);
  }, [state.pallets]);

  const getBoxesByPallet = useCallback(async (palletId: string) => {
    return state.boxes.filter((b) => b.palletId === palletId);
  }, [state.boxes]);

  const getBoxesByImport = useCallback(async (importId: string) => {
    const importPallets = state.pallets.filter((p) => p.importId === importId);
    const palletIds = new Set(importPallets.map((p) => p.id));
    return state.boxes.filter((b) => palletIds.has(b.palletId));
  }, [state.pallets, state.boxes]);

  const resolveBox = useCallback(async (importCode: string, boxNumber: string, palletNumber?: string) => {
    const imp = state.imports.find((i) => i.code === importCode);
    if (!imp) return null;

    let pallet: OfflinePallet | undefined;
    if (palletNumber) {
      pallet = state.pallets.find((p) => p.importId === imp.id && p.number === palletNumber);
    } else {
      const importPallets = state.pallets.filter((p) => p.importId === imp.id);
      for (const p of importPallets) {
        const found = state.boxes.find((b) => b.palletId === p.id && b.number === boxNumber);
        if (found) { pallet = p; break; }
      }
    }

    if (!pallet) {
      const directBox = state.boxes.find((b) => {
        const boxPallet = state.pallets.find((p) => p.id === b.palletId);
        return boxPallet?.importId === imp.id && b.number === boxNumber;
      });
      if (!directBox) return null;
      const boxProds = state.boxProducts.filter((bp) => bp.boxId === directBox.id);
      const products = boxProds.map((bp) => {
        const product = state.products.find((p) => p.id === bp.productId);
        return {
          productId: bp.productId,
          productCode: product?.code ?? "",
          productDescription: product?.description ?? "",
           productUnit: product?.unit ?? "UND",
           supplierCode: bp.supplierCode ?? product?.supplierCode ?? undefined,
          expectedQty: bp.expectedQty,
        };
      });

      return {
        id: directBox.id,
        number: directBox.number,
        import: imp.code,
        pallet: state.pallets.find((p) => p.id === directBox.palletId)?.number ?? null,
        products,
      };
    }

    const box = state.boxes.find((b) => b.palletId === pallet.id && b.number === boxNumber);
    if (!box) return null;

    const boxProds = state.boxProducts.filter((bp) => bp.boxId === box.id);
    const products = boxProds.map((bp) => {
      const product = state.products.find((p) => p.id === bp.productId);
      return {
        productId: bp.productId,
        productCode: product?.code ?? "",
        productDescription: product?.description ?? "",
         productUnit: product?.unit ?? "UND",
         supplierCode: bp.supplierCode ?? product?.supplierCode ?? undefined,
        expectedQty: bp.expectedQty,
      };
    });

    return {
      id: box.id,
      number: box.number,
      import: imp.code,
      pallet: pallet.number,
      products,
    };
  }, [state.imports, state.pallets, state.boxes, state.boxProducts, state.products]);

  const findProductByCode = useCallback(async (code: string) => {
    return state.products.find((p) => p.code === code || p.barcode === code) ?? null;
  }, [state.products]);

  return {
    ...state,
    syncData,
    getImports,
    getPalletsByImport,
    getBoxesByPallet,
    getBoxesByImport,
    resolveBox,
    findProductByCode,
    refreshCache: loadFromCache,
  };
}
