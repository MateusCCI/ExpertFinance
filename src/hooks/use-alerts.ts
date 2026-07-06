import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface Alert {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "danger";
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from("alerts")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) console.error("Error fetching alerts:", error);
        if (!cancelled) {
          setAlerts(data || []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching alerts:", err);
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("id", id);

    if (error) throw error;
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
    );
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("is_read", false);

    if (error) throw error;
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
  };

  const createAlert = async (alert: Omit<Alert, "id" | "user_id" | "is_read" | "created_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from("alerts")
      .insert({ ...alert, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setAlerts((prev) => [data, ...prev]);
    return data;
  };

  const deleteAlert = async (id: string) => {
    const { error } = await supabase
      .from("alerts")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return { alerts, unreadCount, loading, markAsRead, markAllAsRead, createAlert, deleteAlert };
}
