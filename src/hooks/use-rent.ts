import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface RentConfig {
  id: string;
  user_id: string;
  landlord_name: string;
  monthly_rent_amount: number;
  due_day: number;
  pix_key: string | null;
  accumulated_landlord_spending: number;
  payment_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useRent() {
  const [config, setConfig] = useState<RentConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("rent_config")
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Error fetching rent config:", error);
      }
      setConfig(data);
      setLoading(false);
    };

    fetch();
  }, []);

  const saveConfig = async (rent: Omit<RentConfig, "id" | "user_id" | "created_at" | "updated_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    // Garantir que o perfil existe
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      await supabase
        .from("profiles")
        .insert({ id: user.id, name: user.email?.split("@")[0] ?? "Usuário", email: user.email });
    }

    if (config) {
      const { error } = await supabase
        .from("rent_config")
        .update({ ...rent, updated_at: new Date().toISOString() })
        .eq("id", config.id);

      if (error) throw error;
      setConfig({ ...config, ...rent });
    } else {
      // Upsert: tenta inserir, se já existir atualiza
      const { data, error } = await supabase
        .from("rent_config")
        .upsert({ ...rent, user_id: user.id }, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      if (error) throw error;
      setConfig(data);
      return data;
    }
  };

  const updateSpending = async (amount: number) => {
    if (!config) return;
    const newTotal = config.accumulated_landlord_spending + amount;
    const { error } = await supabase
      .from("rent_config")
      .update({ accumulated_landlord_spending: newTotal, updated_at: new Date().toISOString() })
      .eq("id", config.id);

    if (error) throw error;
    setConfig({ ...config, accumulated_landlord_spending: newTotal });
  };

  return { config, loading, saveConfig, updateSpending };
}
