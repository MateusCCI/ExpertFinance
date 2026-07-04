/**
 * IndexedDB offline-first cache layer.
 *
 * Implements the "Baratear" principle: processamento pesado e buscas
 * são feitos localmente primeiro, sincronizando com Supabase em background.
 *
 * Estrutura:
 * - Categorias e catálogos: cache local (leitura offline)
 * - Transações pendentes: fila de sync (escrita offline)
 * - Busca inteligente (Typeahead): via índice local
 */

const DB_NAME = "minhas-financas";
const DB_VERSION = 1;

export interface SyncQueueItem {
  id?: number;
  action: "create" | "update" | "delete";
  table: string;
  data: unknown;
  clientId: string;
  createdAt: number;
  retries: number;
}

export interface CachedCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  parentId?: string;
}

export interface CachedTransaction {
  clientId: string;
  accountId: string;
  creditCardId?: string;
  categoryId?: string;
  type: string;
  amount: number;
  description: string;
  date: number;
  settlementTag: string;
  settledPersonId?: string;
  synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Category catalog for typeahead
      if (!db.objectStoreNames.contains("categories")) {
        const cats = db.createObjectStore("categories", {
          keyPath: "id",
        });
        cats.createIndex("by_name", "name", { unique: false });
      }

      // Transaction sync queue
      if (!db.objectStoreNames.contains("syncQueue")) {
        const queue = db.createObjectStore("syncQueue", {
          keyPath: "id",
          autoIncrement: true,
        });
        queue.createIndex("by_created", "createdAt", { unique: false });
        queue.createIndex("by_retries", "retries", { unique: false });
      }

      // Local transaction cache
      if (!db.objectStoreNames.contains("transactions")) {
        const txns = db.createObjectStore("transactions", {
          keyPath: "clientId",
        });
        txns.createIndex("by_date", "date", { unique: false });
        txns.createIndex("by_synced", "synced", { unique: false });
      }

      // Account cache
      if (!db.objectStoreNames.contains("accounts")) {
        db.createObjectStore("accounts", { keyPath: "id" });
      }

      // Third party ledger cache
      if (!db.objectStoreNames.contains("thirdParty")) {
        db.createObjectStore("thirdParty", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// === Generic CRUD helpers ===

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function getByKey<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve((request.result as T) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function put(storeName: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function remove(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// === Public API ===

export const dbLocal = {
  // ---- Categories (Typeahead) ----
  async cacheCategories(categories: CachedCategory[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("categories", "readwrite");
      const store = tx.objectStore("categories");
      for (const cat of categories) {
        store.put(cat);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async searchCategories(query: string): Promise<CachedCategory[]> {
    const all = await getAll<CachedCategory>("categories");
    const q = query.toLowerCase();
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  },

  async getAllCategories(): Promise<CachedCategory[]> {
    return getAll<CachedCategory>("categories");
  },

  // ---- Sync Queue (Offline Writes) ----
  async enqueue(item: Omit<SyncQueueItem, "id" | "createdAt" | "retries">): Promise<void> {
    const entry: SyncQueueItem = {
      ...item,
      createdAt: Date.now(),
      retries: 0,
    };
    await put("syncQueue", entry);
  },

  async getPendingItems(): Promise<SyncQueueItem[]> {
    return getAll<SyncQueueItem>("syncQueue");
  },

  async removeSyncItem(id: number): Promise<void> {
    await remove("syncQueue", String(id));
  },

  // ---- Transaction Cache ----
  async cacheTransaction(txn: CachedTransaction): Promise<void> {
    await put("transactions", txn);
  },

  async getTransactionsByDate(
    start: number,
    end: number,
  ): Promise<CachedTransaction[]> {
    const all = await getAll<CachedTransaction>("transactions");
    return all.filter((t) => t.date >= start && t.date <= end);
  },

  // ---- Accounts ----
  async cacheAccounts(accounts: Record<string, unknown>[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("accounts", "readwrite");
      const store = tx.objectStore("accounts");
      for (const acc of accounts) {
        store.put(acc);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getAccounts(): Promise<Record<string, unknown>[]> {
    return getAll("accounts");
  },

  // ---- Utility ----
  async clearAll(): Promise<void> {
    const stores = [
      "categories",
      "syncQueue",
      "transactions",
      "accounts",
      "thirdParty",
    ];
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, "readwrite");
      for (const store of stores) {
        tx.objectStore(store).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
