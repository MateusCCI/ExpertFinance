import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface LandlordPurchase {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  source_name: string;
  source_type: string;
  purchase_type: string;
  installment_current: number | null;
  installment_total: number | null;
  purchase_date: string;
  created_at: string;
}

export function useLandlordPurchases() {
  const [purchases, setPurchases] = useState<LandlordPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("landlord_purchases")
        .select("*")
        .order("purchase_date", { ascending: false });

      if (error) console.error("Error fetching landlord purchases:", error);
      setPurchases(data || []);
      setLoading(false);
    };

    fetch();
  }, []);

  const addPurchase = async (purchase: Omit<LandlordPurchase, "id" | "user_id" | "created_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const { data, error } = await supabase
      .from("landlord_purchases")
      .insert({ ...purchase, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setPurchases((prev) => [data, ...prev]);
    return data;
  };

  const deletePurchase = async (id: string) => {
    const { error } = await supabase
      .from("landlord_purchases")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setPurchases((prev) => prev.filter((p) => p.id !== id));
  };

  return { purchases, loading, addPurchase, deletePurchase };
}
