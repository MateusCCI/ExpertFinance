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
    const { data, error } = await supabase
      .from("credit_cards")
      .insert({ ...card, user_id: user?.id ?? "", sync_status: "synced" })
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
    const { error } = await supabase
      .from("credit_cards")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCardLimit = async (id: string, delta: number) => {
    const physicalId = await getPhysicalCardId(id);

    const { data: current, error: fetchError } = await supabase
      .from("credit_cards")
      .select("available_limit, total_limit")
      .eq("id", physicalId)
      .single();

    if (fetchError) throw fetchError;

    const currentLimit = current?.available_limit ?? 0;
    const newLimit = Math.max(0, currentLimit + delta);

    const { error } = await supabase
      .from("credit_cards")
      .update({ available_limit: newLimit, updated_at: new Date().toISOString() })
      .eq("id", physicalId);

    if (error) throw error;

    setCards((prev) => prev.map((c) => (c.id === physicalId ? { ...c, available_limit: newLimit } : c)));
  };

  return { cards, loading, createCard, updateCard, deleteCard, updateCardLimit };
}
