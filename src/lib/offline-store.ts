"use client";

const DB_NAME = "stockscan-data";
const DB_VERSION = 1;

export type OfflineProduct = {
  id: string;
  code: string;
  barcode: string | null;
  description: string;
  unit: string;
  category: string | null;
  supplierCode: string | null;
  theoreticalStock: number;
  active: boolean;
};

export type OfflineImport = {
  id: string;
  code: string;
  description: string | null;
  active: boolean;
};

export type OfflinePallet = {
  id: string;
  importId: string;
  number: string;
  active: boolean;
};

export type OfflineBox = {
  id: string;
  palletId: string;
  number: string;
  expectedPositionId: string | null;
  active: boolean;
};

export type OfflineBoxProduct = {
  id: string;
  boxId: string;
  productId: string;
  orderIndex: number;
  expectedQty: number | null;
  active: boolean;
};

export type SyncMetadata = {
  key: string;
  lastSync: string;
  count: number;
};

type StoreName = "products" | "imports" | "pallets" | "boxes" | "boxProducts" | "syncMeta";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("products")) {
        const s = db.createObjectStore("products", { keyPath: "id" });
        s.createIndex("code", "code", { unique: true });
        s.createIndex("barcode", "barcode", { unique: false });
      }
      if (!db.objectStoreNames.contains("imports")) {
        const s = db.createObjectStore("imports", { keyPath: "id" });
        s.createIndex("code", "code", { unique: true });
      }
      if (!db.objectStoreNames.contains("pallets")) {
        const s = db.createObjectStore("pallets", { keyPath: "id" });
        s.createIndex("importId", "importId", { unique: false });
        s.createIndex("importId_number", ["importId", "number"], { unique: true });
      }
      if (!db.objectStoreNames.contains("boxes")) {
        const s = db.createObjectStore("boxes", { keyPath: "id" });
        s.createIndex("palletId", "palletId", { unique: false });
        s.createIndex("palletId_number", ["palletId", "number"], { unique: true });
      }
      if (!db.objectStoreNames.contains("boxProducts")) {
        const s = db.createObjectStore("boxProducts", { keyPath: "id" });
        s.createIndex("boxId", "boxId", { unique: false });
        s.createIndex("productId", "productId", { unique: false });
      }
      if (!db.objectStoreNames.contains("syncMeta")) {
        db.createObjectStore("syncMeta", { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putAll<T extends object>(storeName: StoreName, items: T[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  for (const item of items) {
    store.put(item);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getByIndex<T>(storeName: StoreName, indexName: string, value: string | string[]): Promise<T[]> {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const index = store.index(indexName);
  return new Promise((resolve, reject) => {
    const req = index.getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getOneByIndex<T>(storeName: StoreName, indexName: string, value: string): Promise<T | undefined> {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const index = store.index(indexName);
  return new Promise((resolve, reject) => {
    const req = index.get(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function clearStore(storeName: StoreName): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).clear();
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateSyncMeta(key: string, count: number): Promise<void> {
  const meta: SyncMetadata = {
    key,
    lastSync: new Date().toISOString(),
    count,
  };
  await putAll("syncMeta", [meta]);
}

async function getSyncMeta(key: string): Promise<SyncMetadata | undefined> {
  const db = await openDB();
  const tx = db.transaction("syncMeta", "readonly");
  const store = tx.objectStore("syncMeta");
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const offlineStore = {
  putAll,
  getAll,
  getByIndex,
  getOneByIndex,
  clearStore,
  updateSyncMeta,
  getSyncMeta,
};
