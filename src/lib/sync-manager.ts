import { supabase } from "./supabase";

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

function getQueue(): SyncItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue: SyncItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(item: Omit<SyncItem, "id" | "createdAt" | "retries">) {
  const queue = getQueue();
  queue.push({
    ...item,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    retries: 0,
  });
  saveQueue(queue);
}

export async function flushQueue(): Promise<number> {
  const queue = getQueue();
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

  saveQueue(remaining);
  return synced;
}

export function getPendingCount(): number {
  return getQueue().length;
}
