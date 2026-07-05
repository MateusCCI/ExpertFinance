import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ensureProfile } from "@/lib/ensure-profile";
import { dbLocal } from "@/lib/indexedb";

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
      // 1. Load from cache
      try {
        const cached = await dbLocal.getCategories<Category>();
        if (cached.length > 0) {
          setCategories(cached);
          setLoading(false);
        }
      } catch {}

      // 2. Fetch fresh
      try {
        await ensureProfile();
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        if (error) throw error;
        const fresh = data || [];
        setCategories(fresh);
        setLoading(false);
        dbLocal.cacheCategories(fresh).catch(() => {});
      } catch (err) {
        console.error("Error fetching categories:", err);
        if (categories.length === 0) setLoading(false);
      }
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
    setCategories((prev) => {
      const next = [...prev, data].sort((a, b) => a.name.localeCompare(b.name));
      dbLocal.cacheCategories(next).catch(() => {});
      return next;
    });
    return data;
  };

  const updateCategory = async (id: string, patch: Partial<Category>) => {
    const { error } = await supabase
      .from("categories")
      .update(patch)
      .eq("id", id);

    if (error) throw error;
    setCategories((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      dbLocal.cacheCategories(next).catch(() => {});
      return next;
    });
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== id);
      dbLocal.cacheCategories(next).catch(() => {});
      return next;
    });
  };

  return { categories, loading, createCategory, updateCategory, deleteCategory };
}
