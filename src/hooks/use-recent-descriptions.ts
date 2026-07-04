import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ensureProfile } from "@/lib/ensure-profile";

export function useRecentDescriptions() {
  const [descriptions, setDescriptions] = useState<string[]>([]);

  const load = async () => {
    await ensureProfile();
    const { data } = await supabase
      .from("recent_descriptions")
      .select("description")
      .order("created_at", { ascending: false })
      .limit(50);

    setDescriptions(data?.map((d) => d.description) ?? []);
  };

  const save = async (description: string) => {
    if (!description.trim()) return;
    await ensureProfile();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("recent_descriptions")
      .upsert({ user_id: user.id, description: description.trim() }, { onConflict: "user_id,description" });

    setDescriptions((prev) => {
      const filtered = prev.filter((d) => d !== description.trim());
      return [description.trim(), ...filtered].slice(0, 50);
    });
  };

  return { descriptions, load, save };
}
