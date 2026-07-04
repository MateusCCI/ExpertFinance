import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ensureProfile } from "@/lib/ensure-profile";
import { getPhysicalCardId } from "@/lib/card-utils";

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  credit_card_id: string | null;
  category_id: string | null;
  type: "income" | "expense" | "transfer";
  amount: number;
  description: string;
  date: string;
  installment_count: number | null;
  installment_number: number | null;
  installment_group_id: string | null;
  destination_account_id: string | null;
  settlement_tag: string;
  settled_person_id: string | null;
  notes: string | null;
  is_recurring: boolean;
  recurring_id: string | null;
  sync_status: "synced" | "pending" | "conflict";
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useTransactions(accountId?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      await ensureProfile();
      let query = supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .limit(100);

      if (accountId) {
        query = query.eq("account_id", accountId);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching transactions:", error);
      }
      setTransactions(data || []);
      setLoading(false);
    };

    fetch();
  }, [accountId]);

  const createTransaction = async (tx: Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at" | "sync_status">) => {
    await ensureProfile();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");
    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...tx, user_id: user.id, sync_status: "synced" })
      .select()
      .single();

    if (error) throw error;
    setTransactions((prev) => [data, ...prev]);
    return data;
  };

  const updateTransaction = async (id: string, patch: Partial<Transaction>) => {
    const { error } = await supabase
      .from("transactions")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const deleteTransaction = async (id: string) => {
    // Buscar transação antes de deletar para restaurar limite
    const tx = transactions.find((t) => t.id === id);

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    // Restaurar limite do cartão se for despesa
    if (tx?.credit_card_id && tx.type === "expense") {
      try {
        const physicalId = await getPhysicalCardId(tx.credit_card_id);
        const { data: card } = await supabase
          .from("credit_cards")
          .select("available_limit")
          .eq("id", physicalId)
          .maybeSingle();

        if (card) {
          await supabase
            .from("credit_cards")
            .update({ available_limit: card.available_limit + tx.amount, updated_at: new Date().toISOString() })
            .eq("id", physicalId);
        }
      } catch {
        // Cartão pode ter sido deletado — limite não restaurado
      }
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  return { transactions, loading, createTransaction, updateTransaction, deleteTransaction };
}

export function useRecentTransactions(limit = 10) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching recent transactions:", error);
      }
      setTransactions(data || []);
      setLoading(false);
    };

    fetch();
  }, [limit]);

  return { transactions, loading };
}
