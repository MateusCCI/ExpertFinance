import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ensureProfile } from "@/lib/ensure-profile";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  parent_id: string | null;
  created_at: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      await ensureProfile();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching categories:", error);
      }
      setCategories(data || []);
      setLoading(false);
    };

    fetch();
  }, []);

  const createCategory = async (cat: Omit<Category, "id" | "user_id" | "created_at">) => {
    await ensureProfile();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from("categories")
      .insert({ ...cat, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const updateCategory = async (id: string, patch: Partial<Category>) => {
    const { error } = await supabase
      .from("categories")
      .update(patch)
      .eq("id", id);

    if (error) throw error;
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return { categories, loading, createCategory, updateCategory, deleteCategory };
}
