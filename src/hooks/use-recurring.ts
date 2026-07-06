import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ensureProfile } from "@/lib/ensure-profile";

export interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id: string;
  credit_card_id: string | null;
  category_id: string | null;
  type: "income" | "expense" | "transfer";
  amount: number;
  description: string;
  frequency: "monthly" | "yearly";
  day_of_month: number;
  day_of_week: null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  is_variable: boolean;
  last_generated: string | null;
  created_at: string;
  updated_at: string;
}

export type RecurringInsert = Omit<RecurringTransaction, "id" | "user_id" | "created_at" | "updated_at" | "last_generated">;

function shouldGenerate(rec: RecurringTransaction): boolean {
  if (rec.is_variable) return false; // variáveis precisam de confirmação manual

  const now = new Date();
  const today = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  if (!rec.is_active) return false;
  if (rec.end_date && new Date(rec.end_date) < now) return false;

  const lastGen = rec.last_generated ? new Date(rec.last_generated) : null;

  if (rec.frequency === "monthly") {
    if (today < rec.day_of_month) return false;
    if (lastGen) {
      const lastMonth = lastGen.getMonth();
      const lastYear = lastGen.getFullYear();
      if (lastYear === currentYear && lastMonth === currentMonth) return false;
    }
    return true;
  }

  if (rec.frequency === "yearly") {
    if (today < rec.day_of_month) return false;
    const startDate = new Date(rec.start_date);
    if (currentMonth < startDate.getMonth()) return false;
    if (currentMonth === startDate.getMonth() && today < rec.day_of_month) return false;
    if (lastGen) {
      const lastYear = lastGen.getFullYear();
      if (lastYear === currentYear) return false;
    }
    return true;
  }

  return false;
}

export function isVariableDue(rec: RecurringTransaction): boolean {
  if (!rec.is_variable || !rec.is_active) return false;
  if (rec.end_date && new Date(rec.end_date) < new Date()) return false;

  const now = new Date();
  const today = now.getDate();
  if (today < rec.day_of_month) return false;

  const lastGen = rec.last_generated ? new Date(rec.last_generated) : null;
  if (lastGen) {
    const lastMonth = lastGen.getMonth();
    const lastYear = lastGen.getFullYear();
    if (rec.frequency === "monthly" && lastYear === now.getFullYear() && lastMonth === now.getMonth()) return false;
    if (rec.frequency === "yearly" && lastYear === now.getFullYear()) return false;
  }

  return true;
}

export function useRecurringTransactions() {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        await ensureProfile();
        const { data, error } = await supabase
          .from("recurring_transactions")
          .select("*")
          .order("day_of_month");

        if (error) console.error("Error fetching recurring transactions:", error);
        if (!cancelled) {
          setRecurring((data as RecurringTransaction[]) || []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching recurring:", err);
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  const createRecurring = async (data: RecurringInsert) => {
    await ensureProfile();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const { data: created, error } = await supabase
      .from("recurring_transactions")
      .insert({ ...data, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setRecurring((prev) => [...prev, created as RecurringTransaction].sort((a, b) => a.day_of_month - b.day_of_month));
    return created;
  };

  const updateRecurring = async (id: string, patch: Partial<RecurringTransaction>) => {
    const { error } = await supabase
      .from("recurring_transactions")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    setRecurring((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const toggleRecurring = async (id: string, isActive: boolean) => {
    await updateRecurring(id, { is_active: isActive });
  };

  const deleteRecurring = async (id: string) => {
    const { error } = await supabase
      .from("recurring_transactions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setRecurring((prev) => prev.filter((r) => r.id !== id));
  };

  const confirmVariable = async (id: string, amount: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const rec = recurring.find((r) => r.id === id);
    if (!rec) throw new Error("Assinatura não encontrada");

    const now = new Date().toISOString();

    const { error: txErr } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        account_id: rec.account_id,
        credit_card_id: rec.credit_card_id,
        category_id: rec.category_id,
        type: rec.type,
        amount,
        description: rec.description,
        date: now,
        settlement_tag: "normal",
        is_recurring: true,
        recurring_id: rec.id,
        sync_status: "synced",
      });

    if (txErr) throw txErr;

    await supabase
      .from("recurring_transactions")
      .update({ amount, last_generated: now, updated_at: now })
      .eq("id", id);

    setRecurring((prev) => prev.map((r) => (r.id === id ? { ...r, amount, last_generated: now } : r)));
  };

  const generateDue = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const due = recurring.filter(shouldGenerate);
    if (due.length === 0) return;

    const now = new Date().toISOString();

    for (const rec of due) {
      try {
        const { error: txErr } = await supabase
          .from("transactions")
          .insert({
            user_id: user.id,
            account_id: rec.account_id,
            credit_card_id: rec.credit_card_id,
            category_id: rec.category_id,
            type: rec.type,
            amount: rec.amount,
            description: rec.description,
            date: now,
            settlement_tag: "normal",
            is_recurring: true,
            recurring_id: rec.id,
            sync_status: "synced",
          });

        if (txErr) {
          console.error(`Erro ao gerar transação para "${rec.description}":`, txErr.message);
          continue;
        }

        await supabase
          .from("recurring_transactions")
          .update({ last_generated: now, updated_at: now })
          .eq("id", rec.id);

        setRecurring((prev) => prev.map((r) => (r.id === rec.id ? { ...r, last_generated: now } : r)));
      } catch (err) {
        console.error(`Erro inesperado ao gerar "${rec.description}":`, err);
      }
    }
  };

  return { recurring, loading, createRecurring, updateRecurring, toggleRecurring, deleteRecurring, confirmVariable, generateDue };
}
