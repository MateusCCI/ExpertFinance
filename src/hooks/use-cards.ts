import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ensureProfile } from "@/lib/ensure-profile";
import { getPhysicalCardId } from "@/lib/card-utils";
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
    const fetch = async () => {
      await ensureProfile();
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .neq("status", "cancelled")
        .order("name");

      if (error) console.error("Error fetching credit cards:", error);
      setCards(data || []);
      setLoading(false);
    };

    fetch();
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
    setCards((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const updateCard = async (id: string, patch: Partial<CreditCard>) => {
    const { error } = await supabase
      .from("credit_cards")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const deleteCard = async (id: string) => {
    // 1. Desvincular transações
    const txResult = await supabase
      .from("transactions")
      .update({ credit_card_id: null, updated_at: new Date().toISOString() })
      .eq("credit_card_id", id)
      .select("id");
    console.log("[deleteCard] transactions unlink:", txResult.data?.length ?? 0, "rows", txResult.error?.message ?? "ok");

    // 2. Excluir faturas
    const invResult = await supabase
      .from("invoices")
      .delete()
      .eq("credit_card_id", id)
      .select("id");
    console.log("[deleteCard] invoices delete:", invResult.data?.length ?? 0, "rows", invResult.error?.message ?? "ok");

    // 3. Excluir virtuais filhos
    const virtResult = await supabase
      .from("credit_cards")
      .delete()
      .eq("parent_card_id", id)
      .select("id");
    console.log("[deleteCard] virtuals delete:", virtResult.data?.length ?? 0, "rows", virtResult.error?.message ?? "ok");

    // 4. Tentar hard delete
    const delResult = await supabase
      .from("credit_cards")
      .delete()
      .eq("id", id)
      .select("id");
    console.log("[deleteCard] card hard delete:", delResult.data?.length ?? 0, "rows", delResult.error?.message ?? "ok");

    if (delResult.error || !delResult.data || delResult.data.length === 0) {
      console.log("[deleteCard] hard delete falhou, tentando soft delete...");
      const softResult = await supabase
        .from("credit_cards")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("id");
      console.log("[deleteCard] soft delete:", softResult.data?.length ?? 0, "rows", softResult.error?.message ?? "ok");
      if (softResult.error || !softResult.data || softResult.data.length === 0) {
        throw new Error("Nenhuma operação foi executada. Verifique as políticas RLS no Supabase.");
      }
    }

    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCardLimit = async (id: string, delta: number) => {
    const physicalId = await getPhysicalCardId(id);

    // Try atomic RPC first (prevents race conditions)
    const { data: newLimit, error: rpcError } = await supabase
      .rpc("update_card_limit_atomic", { p_card_id: physicalId, p_delta: delta });

    if (!rpcError && newLimit !== null) {
      setCards((prev) => prev.map((c) => (c.id === physicalId ? { ...c, available_limit: newLimit } : c)));
      return;
    }

    // Fallback to read-then-write if RPC not available
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

    setCards((prev) => prev.map((c) => (c.id === physicalId ? { ...c, available_limit: updatedLimit } : c)));
  };

  return { cards, loading, createCard, updateCard, deleteCard, updateCardLimit };
}
