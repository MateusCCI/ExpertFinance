import { supabase } from "./supabase";
import { encrypt, decrypt, clearKeyCache } from "./crypto";

const QUEUE_KEY = "offline-sync-queue";

export interface SyncItem {
  id: string;
  table: string;
  action: "insert" | "update" | "delete";
  data: Record<string, unknown>;
  matchField?: string;
  matchValue?: unknown;
  createdAt: number;
  retries: number;
}

async function getSessionToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function getQueue(): Promise<SyncItem[]> {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];

    const token = await getSessionToken();
    if (!token) return JSON.parse(raw || "[]");

    // Try decrypting; fall back to plaintext if not encrypted
    try {
      const decrypted = await decrypt(raw, token);
      return JSON.parse(decrypted);
    } catch {
      return JSON.parse(raw);
    }
  } catch {
    return [];
  }
}

async function saveQueue(queue: SyncItem[]): Promise<void> {
  const json = JSON.stringify(queue);
  const token = await getSessionToken();

  if (token) {
    try {
      const encrypted = await encrypt(json, token);
      localStorage.setItem(QUEUE_KEY, encrypted);
      return;
    } catch {
      // Fall through to plaintext
    }
  }

  localStorage.setItem(QUEUE_KEY, json);
}

export async function enqueue(item: Omit<SyncItem, "id" | "createdAt" | "retries">): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...item,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    retries: 0,
  });
  await saveQueue(queue);
}

export async function flushQueue(): Promise<number> {
  const queue = await getQueue();
  if (queue.length === 0) return 0;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  let synced = 0;
  const remaining: SyncItem[] = [];

  for (const item of queue) {
    try {
      if (item.action === "insert") {
        const { error } = await supabase
          .from(item.table)
          .upsert({ ...item.data, user_id: user.id }, { onConflict: item.matchField });
        if (error) throw error;
      } else if (item.action === "update" && item.matchField) {
        const { error } = await supabase
          .from(item.table)
          .update(item.data)
          .eq(item.matchField, item.matchValue);
        if (error) throw error;
      } else if (item.action === "delete" && item.matchField) {
        const { error } = await supabase
          .from(item.table)
          .delete()
          .eq(item.matchField, item.matchValue);
        if (error) throw error;
      }
      synced++;
    } catch {
      item.retries++;
      if (item.retries < 3) {
        remaining.push(item);
      }
    }
  }

  await saveQueue(remaining);
  return synced;
}

export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
