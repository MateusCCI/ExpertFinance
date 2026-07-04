import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  account_id: string | null;
  icon: string | null;
  color: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useGoals() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching goals:", error);
      }
      setGoals(data || []);
      setLoading(false);
    };

    fetch();
  }, []);

  const createGoal = async (goal: Omit<SavingsGoal, "id" | "user_id" | "current_amount" | "is_completed" | "completed_at" | "created_at" | "updated_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from("savings_goals")
      .insert({ ...goal, user_id: user.id, current_amount: 0, is_completed: false })
      .select()
      .single();

    if (error) throw error;
    setGoals((prev) => [data, ...prev]);
    return data;
  };

  const updateGoal = async (id: string, patch: Partial<SavingsGoal>) => {
    const { error } = await supabase
      .from("savings_goals")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const deleteGoal = async (id: string) => {
    const { error } = await supabase
      .from("savings_goals")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const addToGoal = async (id: string, amount: number) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    const newAmount = goal.current_amount + amount;
    const isCompleted = newAmount >= goal.target_amount;

    const { error } = await supabase
      .from("savings_goals")
      .update({
        current_amount: newAmount,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : goal.completed_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id
          ? {
              ...g,
              current_amount: newAmount,
              is_completed: isCompleted,
              completed_at: isCompleted ? new Date().toISOString() : g.completed_at,
            }
          : g
      )
    );
  };

  return { goals, loading, createGoal, updateGoal, deleteGoal, addToGoal };
}
