import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ensureProfile } from "@/lib/ensure-profile";
import { getPhysicalCardId } from "@/lib/card-utils";
import { dbLocal } from "@/lib/indexedb";
import { toast } from "sonner";

export interface CreditCard {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  brand: string | null;
  last_digits: string | null;
  total_limit: number;
  available_limit: number;
  closing_day: number;
  due_day: number;
  annual_fee: number | null;
  spend_target_for_waiver: number | null;
  cashback_rate: number | null;
  cashback_balance: number;
  parent_card_id: string | null;
  status: "active" | "blocked" | "cancelled";
  color: string | null;
  sync_status: "synced" | "pending" | "conflict";
  created_at: string;
  updated_at: string;
}

export function useCreditCards() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      // 1. Load from IndexedDB cache first
      try {
        const cached = await Promise.race([
          dbLocal.getCards<CreditCard>(),
          new Promise<[]>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
        ]);
        if (!cancelled && cached.length > 0) {
          setCards(cached);
          setLoading(false);
        }
      } catch {}

      // 2. Fetch fresh data from Supabase
      try {
        await ensureProfile();
        const { data, error } = await supabase
          .from("credit_cards")
          .select("*")
          .neq("status", "cancelled")
          .order("name");

        if (error) throw error;

        const fresh = data || [];
        if (!cancelled) {
          setCards(fresh);
          setLoading(false);
        }

        // 3. Update cache
        dbLocal.cacheCards(fresh).catch(() => {});
      } catch (err) {
        console.error("Error fetching credit cards:", err);
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  const createCard = async (card: Omit<CreditCard, "id" | "user_id" | "created_at" | "updated_at" | "sync_status">) => {
    await ensureProfile();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");
    const { data, error } = await supabase
      .from("credit_cards")
      .insert({ ...card, user_id: user.id, sync_status: "synced" })
      .select()
      .single();

    if (error) throw error;
    setCards((prev) => {
      const next = [...prev, data].sort((a, b) => a.name.localeCompare(b.name));
      dbLocal.cacheCards(next).catch(() => {});
      return next;
    });
    return data;
  };

  const updateCard = async (id: string, patch: Partial<CreditCard>) => {
    const { error } = await supabase
      .from("credit_cards")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    setCards((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      dbLocal.cacheCards(next).catch(() => {});
      return next;
    });
  };

  const deleteCard = async (id: string) => {
    const txResult = await supabase
      .from("transactions")
      .update({ credit_card_id: null, updated_at: new Date().toISOString() })
      .eq("credit_card_id", id)
      .select("id");

    const invResult = await supabase
      .from("invoices")
      .delete()
      .eq("credit_card_id", id)
      .select("id");

    const virtResult = await supabase
      .from("credit_cards")
      .delete()
      .eq("parent_card_id", id)
      .select("id");

    const delResult = await supabase
      .from("credit_cards")
      .delete()
      .eq("id", id)
      .select("id");

    if (delResult.error || !delResult.data || delResult.data.length === 0) {
      const softResult = await supabase
        .from("credit_cards")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id");
      if (softResult.error || !softResult.data || softResult.data.length === 0) {
        throw new Error("Operação bloqueada pelas políticas RLS.");
      }
    }

    setCards((prev) => {
      const next = prev.filter((c) => c.id !== id);
      dbLocal.cacheCards(next).catch(() => {});
      return next;
    });
  };

  const updateCardLimit = async (id: string, delta: number) => {
    const physicalId = await getPhysicalCardId(id);

    const { data: newLimit, error: rpcError } = await supabase
      .rpc("update_card_limit_atomic", { p_card_id: physicalId, p_delta: delta });

    if (!rpcError && newLimit !== null) {
      setCards((prev) => {
        const next = prev.map((c) => (c.id === physicalId ? { ...c, available_limit: newLimit } : c));
        dbLocal.cacheCards(next).catch(() => {});
        return next;
      });
      return;
    }

    const { data: current, error: fetchError } = await supabase
      .from("credit_cards")
      .select("available_limit, total_limit")
      .eq("id", physicalId)
      .maybeSingle();

    if (fetchError || !current) throw fetchError ?? new Error("Cartão não encontrado");

    const currentLimit = current.available_limit ?? 0;
    const updatedLimit = Math.max(0, Math.min(current.total_limit, currentLimit + delta));

    const { error } = await supabase
      .from("credit_cards")
      .update({ available_limit: updatedLimit, updated_at: new Date().toISOString() })
      .eq("id", physicalId);

    if (error) throw error;

    setCards((prev) => {
      const next = prev.map((c) => (c.id === physicalId ? { ...c, available_limit: updatedLimit } : c));
      dbLocal.cacheCards(next).catch(() => {});
      return next;
    });
  };

  return { cards, loading, createCard, updateCard, deleteCard, updateCardLimit };
}
