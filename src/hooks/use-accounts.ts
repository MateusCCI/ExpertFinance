import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { dbLocal } from "@/lib/indexedb";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: "checking" | "savings" | "cash" | "investment";
  balance: number;
  color: string | null;
  is_active: boolean;
  annual_yield: number | null;
  last_yield_date: string | null;
  sync_status: "synced" | "pending" | "conflict";
  created_at: string;
  updated_at: string;
}

async function ensureProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) {
    await supabase
      .from("profiles")
      .insert({ id: user.id, name: user.email?.split("@")[0] ?? "Usuário", email: user.email });
  }
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        const cached = await Promise.race([
          dbLocal.getAccounts<Account>(),
          new Promise<[]>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
        ]);
        if (!cancelled && cached.length > 0) {
          setAccounts(cached);
          setLoading(false);
        }
      } catch {}

      try {
        await ensureProfile();
        const { data, error } = await supabase
          .from("accounts")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        const fresh = data || [];
        if (!cancelled) {
          setAccounts(fresh);
          setLoading(false);
        }
        dbLocal.cacheAccounts(fresh).catch(() => {});
      } catch (err) {
        console.error("Error fetching accounts:", err);
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  const createAccount = async (acc: Omit<Account, "id" | "user_id" | "created_at" | "updated_at" | "sync_status" | "color">) => {
    await ensureProfile();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("accounts")
      .insert({ ...acc, user_id: user?.id ?? "", sync_status: "synced" })
      .select()
      .single();

    if (error) throw error;
    setAccounts((prev) => {
      const next = [...prev, data].sort((a, b) => a.name.localeCompare(b.name));
      dbLocal.cacheAccounts(next).catch(() => {});
      return next;
    });
    return data;
  };

  const updateAccount = async (id: string, patch: Partial<Account>) => {
    const { error } = await supabase
      .from("accounts")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    setAccounts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      dbLocal.cacheAccounts(next).catch(() => {});
      return next;
    });
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase
      .from("accounts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    setAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      dbLocal.cacheAccounts(next).catch(() => {});
      return next;
    });
  };

  return { accounts, loading, createAccount, updateAccount, deleteAccount };
}
