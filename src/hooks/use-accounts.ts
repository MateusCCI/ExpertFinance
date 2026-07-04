import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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
    const fetch = async () => {
      await ensureProfile();

      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Error fetching accounts:", error);
      }
      setAccounts(data || []);
      setLoading(false);
    };

    fetch();
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
    setAccounts((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const updateAccount = async (id: string, patch: Partial<Account>) => {
    const { error } = await supabase
      .from("accounts")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase
      .from("accounts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  return { accounts, loading, createAccount, updateAccount, deleteAccount };
}
