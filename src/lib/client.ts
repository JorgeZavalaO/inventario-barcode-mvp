const DB_NAME = "stockscan-offline";
const DB_VERSION = 1;
const STORE_NAME = "queue";

function openQueueDB(): Promise<IDBDatabase> {
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

export async function addToQueue(endpoint: string, method: string, body: object): Promise<string> {
  const item = {
    id: crypto.randomUUID(),
    operationId: crypto.randomUUID(),
    endpoint,
    method,
    body: JSON.stringify(body),
    status: "PENDING" as const,
    createdAt: new Date().toISOString(),
  };

  const db = await openQueueDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).add(item);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  window.dispatchEvent(new CustomEvent("offline-queue-changed"));
  return item.id;
}

export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "No se pudo completar la operación");
  }

  return payload;
}

export type OfflineQueueResult<T> = T & { queued?: boolean };

export async function apiFetchOffline<T>(
  endpoint: string,
  init: RequestInit,
  offlinePayload: { endpoint: string; method: string; body: object },
): Promise<OfflineQueueResult<T>> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await addToQueue(offlinePayload.endpoint, offlinePayload.method, offlinePayload.body);
    return { queued: true } as OfflineQueueResult<T>;
  }

  try {
    const result = await apiFetch<T>(endpoint, init);
    return result as OfflineQueueResult<T>;
  } catch (error: any) {
    if (error?.message === "Failed to fetch" || error?.name === "TypeError") {
      await addToQueue(offlinePayload.endpoint, offlinePayload.method, offlinePayload.body);
      return { queued: true } as OfflineQueueResult<T>;
    }
    throw error;
  }
}
