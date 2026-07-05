import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ensureProfile } from "@/lib/ensure-profile";
import { getPhysicalCardId } from "@/lib/card-utils";

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
      try {
        await ensureProfile();
        const { data, error } = await supabase
          .from("credit_cards")
          .select("*")
          .neq("status", "cancelled")
          .order("name");

        if (error) throw error;
        if (!cancelled) {
          setCards(data || []);
          setLoading(false);
        }
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
    const txResult = await supabase
      .from("transactions")
      .update({ credit_card_id: null, updated_at: new Date().toISOString() })
      .eq("credit_card_id", id)
      .select("id");
    console.log("[deleteCard] transactions unlink:", txResult.data?.length ?? 0, "rows", txResult.error?.message ?? "ok");

    const invResult = await supabase
      .from("invoices")
      .delete()
      .eq("credit_card_id", id)
      .select("id");
    console.log("[deleteCard] invoices delete:", invResult.data?.length ?? 0, "rows", invResult.error?.message ?? "ok");

    const virtResult = await supabase
      .from("credit_cards")
      .delete()
      .eq("parent_card_id", id)
      .select("id");
    console.log("[deleteCard] virtuals delete:", virtResult.data?.length ?? 0, "rows", virtResult.error?.message ?? "ok");

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
        throw new Error("Operação bloqueada pelas políticas RLS.");
      }
    }

    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCardLimit = async (id: string, delta: number) => {
    const physicalId = await getPhysicalCardId(id);

    const { data: newLimit, error: rpcError } = await supabase
      .rpc("update_card_limit_atomic", { p_card_id: physicalId, p_delta: delta });

    if (!rpcError && newLimit !== null) {
      setCards((prev) => prev.map((c) => (c.id === physicalId ? { ...c, available_limit: newLimit } : c)));
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

    setCards((prev) => prev.map((c) => (c.id === physicalId ? { ...c, available_limit: updatedLimit } : c)));
  };

  const createVirtualCard = async (physicalId: string, lastDigits: string, name?: string) => {
    await ensureProfile();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const parent = cards.find((c) => c.id === physicalId);
    const virtualName = name || `${parent?.name || "Cartão"} (virtual)`;

    const { data, error } = await supabase
      .from("credit_cards")
      .insert({
        user_id: user.id,
        account_id: parent?.account_id || "",
        name: virtualName,
        brand: parent?.brand || null,
        last_digits: lastDigits.padEnd(4, "0"),
        total_limit: 0,
        available_limit: 0,
        closing_day: parent?.closing_day || 1,
        due_day: parent?.due_day || 1,
        annual_fee: 0,
        spend_target_for_waiver: null,
        cashback_rate: 0,
        cashback_balance: 0,
        parent_card_id: physicalId,
        is_virtual: true,
        status: "active",
        color: parent?.color || null,
        sync_status: "synced",
      })
      .select()
      .single();

    if (error) throw error;
    setCards((prev) => [...prev, data]);
    return data;
  };

  const createVirtualOnlyCard = async (card: Omit<CreditCard, "id" | "user_id" | "created_at" | "updated_at" | "sync_status">) => {
    await ensureProfile();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const { data, error } = await supabase
      .from("credit_cards")
      .insert({ ...card, user_id: user.id, is_virtual: true, sync_status: "synced" })
      .select()
      .single();

    if (error) throw error;
    setCards((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  return { cards, loading, createCard, createVirtualCard, createVirtualOnlyCard, updateCard, deleteCard, updateCardLimit };
}
