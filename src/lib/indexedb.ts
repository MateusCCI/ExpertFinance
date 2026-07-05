/**
 * IndexedDB offline-first cache layer.
 *
 * Estrutura:
 * - credit_cards: cache de cartões (leitura offline)
 * - categories: cache de categorias
 * - accounts: cache de contas
 * - transactions: cache de transações
 * - budgets: cache de orçamentos
 * - recurring: cache de recorrências
 * - syncQueue: fila de operações offline
 */

const DB_NAME = "minhas-financas";
const DB_VERSION = 2;

export interface SyncQueueItem {
  id?: number;
  action: "create" | "update" | "delete";
  table: string;
  data: unknown;
  clientId: string;
  createdAt: number;
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains("categories")) {
          const cats = db.createObjectStore("categories", { keyPath: "id" });
          cats.createIndex("by_name", "name", { unique: false });
        }
        if (!db.objectStoreNames.contains("syncQueue")) {
          const queue = db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true });
          queue.createIndex("by_created", "createdAt", { unique: false });
          queue.createIndex("by_retries", "retries", { unique: false });
        }
        if (!db.objectStoreNames.contains("transactions")) {
          const txns = db.createObjectStore("transactions", { keyPath: "id" });
          txns.createIndex("by_date", "date", { unique: false });
        }
        if (!db.objectStoreNames.contains("accounts")) {
          db.createObjectStore("accounts", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("thirdParty")) {
          db.createObjectStore("thirdParty", { keyPath: "id" });
        }
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains("creditCards")) {
          db.createObjectStore("creditCards", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("budgets")) {
          const budgets = db.createObjectStore("budgets", { keyPath: "id" });
          budgets.createIndex("by_month", ["month", "year"], { unique: false });
        }
        if (!db.objectStoreNames.contains("recurring")) {
          db.createObjectStore("recurring", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("invoices")) {
          const inv = db.createObjectStore("invoices", { keyPath: "id" });
          inv.createIndex("by_card", "credit_card_id", { unique: false });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// === Generic helpers ===

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

async function put(storeName: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function putAll(storeName: string, items: unknown[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    for (const item of items) store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function remove(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// === Public API ===

export const dbLocal = {
  // ---- Credit Cards ----
  async cacheCards(cards: unknown[]): Promise<void> {
    await putAll("creditCards", cards);
  },

  async getCards<T>(): Promise<T[]> {
    return getAll<T>("creditCards");
  },

  async removeCard(id: string): Promise<void> {
    await remove("creditCards", id);
  },

  // ---- Categories ----
  async cacheCategories(categories: unknown[]): Promise<void> {
    await putAll("categories", categories);
  },

  async getCategories<T>(): Promise<T[]> {
    return getAll<T>("categories");
  },

  // ---- Accounts ----
  async cacheAccounts(accounts: unknown[]): Promise<void> {
    await putAll("accounts", accounts);
  },

  async getAccounts<T>(): Promise<T[]> {
    return getAll<T>("accounts");
  },

  // ---- Transactions ----
  async cacheTransactions(transactions: unknown[]): Promise<void> {
    await putAll("transactions", transactions);
  },

  async getTransactions<T>(): Promise<T[]> {
    return getAll<T>("transactions");
  },

  // ---- Budgets ----
  async cacheBudgets(budgets: unknown[]): Promise<void> {
    await putAll("budgets", budgets);
  },

  async getBudgets<T>(): Promise<T[]> {
    return getAll<T>("budgets");
  },

  // ---- Recurring ----
  async cacheRecurring(items: unknown[]): Promise<void> {
    await putAll("recurring", items);
  },

  async getRecurring<T>(): Promise<T[]> {
    return getAll<T>("recurring");
  },

  // ---- Invoices ----
  async cacheInvoices(invoices: unknown[]): Promise<void> {
    await putAll("invoices", invoices);
  },

  async getInvoices<T>(): Promise<T[]> {
    return getAll<T>("invoices");
  },

  // ---- Sync Queue ----
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

  // ---- Utility ----
  async clearAll(): Promise<void> {
    const stores = [
      "categories", "syncQueue", "transactions", "accounts",
      "thirdParty", "creditCards", "budgets", "recurring", "invoices",
    ];
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, "readwrite");
      for (const store of stores) {
        if (db.objectStoreNames.contains(store)) {
          tx.objectStore(store).clear();
        }
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
