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
    let cancelled = false;

    const fetch = async () => {
      try {
        const cached = await Promise.race([
          dbLocal.getCategories<Category>(),
          new Promise<[]>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
        ]);
        if (!cancelled && cached.length > 0) {
          setCategories(cached);
          setLoading(false);
        }
      } catch {}

      try {
        await ensureProfile();
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("name");

        if (error) throw error;
        const fresh = data || [];
        if (!cancelled) {
          setCategories(fresh);
          setLoading(false);
        }
        dbLocal.cacheCategories(fresh).catch(() => {});
      } catch (err) {
        console.error("Error fetching categories:", err);
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
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
