"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type QueueItem = {
  id: string;
  operationId: string;
  endpoint: string;
  method: string;
  body: string;
  status: "PENDING" | "SYNCING" | "SYNCED" | "ERROR";
  error?: string;
  createdAt: string;
};

const DB_NAME = "stockscan-offline";
const DB_VERSION = 1;
const STORE_NAME = "queue";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function useOfflineQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const syncRef = useRef(false);

  const loadItems = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const all: QueueItem[] = await new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      setItems(all);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => { setIsOnline(true); sync(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void loadItems();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [loadItems]);

  const add = useCallback(async (endpoint: string, method: string, body: object) => {
    const item: QueueItem = {
      id: crypto.randomUUID(),
      operationId: crypto.randomUUID(),
      endpoint,
      method,
      body: JSON.stringify(body),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).add(item);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      setItems((prev) => [...prev, item]);
      if (navigator.onLine) sync();
    } catch { /* silent */ }
  }, []);

  const sync = useCallback(async () => {
    if (syncRef.current) return;
    syncRef.current = true;

    try {
      const db = await openDB();
      const pending: QueueItem[] = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const index = tx.objectStore(STORE_NAME).index("status");
        const req = index.getAll("PENDING");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      for (const item of pending) {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put({ ...item, status: "SYNCING" });
        await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });

        try {
          const resp = await fetch(item.endpoint, {
            method: item.method,
            headers: { "Content-Type": "application/json" },
            body: item.body,
          });

          if (resp.ok) {
            const tx2 = db.transaction(STORE_NAME, "readwrite");
            tx2.objectStore(STORE_NAME).put({ ...item, status: "SYNCED" });
            await new Promise<void>((resolve) => { tx2.oncomplete = () => resolve(); });
          } else {
            const tx2 = db.transaction(STORE_NAME, "readwrite");
            tx2.objectStore(STORE_NAME).put({ ...item, status: "ERROR", error: await resp.text() });
            await new Promise<void>((resolve) => { tx2.oncomplete = () => resolve(); });
          }
        } catch {
          const tx2 = db.transaction(STORE_NAME, "readwrite");
          tx2.objectStore(STORE_NAME).put({ ...item, status: "PENDING" });
          await new Promise<void>((resolve) => { tx2.oncomplete = () => resolve(); });
        }
      }

      await loadItems();
    } catch { /* silent */ }
    finally { syncRef.current = false; }
  }, [loadItems]);

  const clearSynced = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("status");
      const synced: QueueItem[] = await new Promise((resolve, reject) => {
        const req = index.getAll("SYNCED");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      for (const item of synced) store.delete(item.id);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      await loadItems();
    } catch { /* silent */ }
  }, [loadItems]);

  return { items, isOnline, add, sync, clearSynced, pendingCount: items.filter((i) => i.status === "PENDING" || i.status === "ERROR").length };
}
