import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { dbLocal } from "@/lib/indexedb";

export interface Invoice {
  id: string;
  user_id: string;
  credit_card_id: string;
  month: number;
  year: number;
  total_amount: number;
  paid_amount: number;
  is_paid: boolean;
  due_date: string;
  closing_date: string;
  rent_abatement_amount: number | null;
  sync_status: "synced" | "pending" | "conflict";
  created_at: string;
  updated_at: string;
}

export function useInvoices(cardId?: string) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // 1. Load from cache
      try {
        const cached = await dbLocal.getInvoices<Invoice>();
        const filtered = cardId ? cached.filter((i) => i.credit_card_id === cardId) : cached;
        if (filtered.length > 0) {
          setInvoices(filtered);
          setLoading(false);
        }
      } catch {}

      // 2. Fetch fresh
      try {
        let query = supabase
          .from("invoices")
          .select("*")
          .order("year", { ascending: false })
          .order("month", { ascending: false });

        if (cardId) {
          query = query.eq("credit_card_id", cardId);
        }

        const { data, error } = await query;
        if (error) throw error;
        const fresh = data || [];
        setInvoices(fresh);
        setLoading(false);
        dbLocal.cacheInvoices(fresh).catch(() => {});
      } catch (err) {
        console.error("Error fetching invoices:", err);
        if (invoices.length === 0) setLoading(false);
      }
    };

    fetch();
  }, [cardId]);

  const createInvoice = async (inv: Omit<Invoice, "id" | "user_id" | "created_at" | "updated_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from("invoices")
      .insert({ ...inv, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setInvoices((prev) => {
      const next = [data, ...prev];
      dbLocal.cacheInvoices(next).catch(() => {});
      return next;
    });
    return data;
  };

  const updateInvoice = async (id: string, patch: Partial<Invoice>) => {
    const { error } = await supabase
      .from("invoices")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    setInvoices((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, ...patch } : i));
      dbLocal.cacheInvoices(next).catch(() => {});
      return next;
    });
  };

  const deleteInvoice = async (id: string) => {
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setInvoices((prev) => {
      const next = prev.filter((i) => i.id !== id);
      dbLocal.cacheInvoices(next).catch(() => {});
      return next;
    });
  };

  return { invoices, loading, createInvoice, updateInvoice, deleteInvoice };
}
