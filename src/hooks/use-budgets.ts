import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: number;
  year: number;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetWithSpent extends Budget {
  spent: number;
}

export interface BudgetStatus {
  percentage: number;
  status: "ok" | "warning" | "danger";
}

export function getBudgetStatus(budget: Budget, spent: number): BudgetStatus {
  const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
  let status: "ok" | "warning" | "danger" = "ok";
  if (percentage >= 90) status = "danger";
  else if (percentage >= 70) status = "warning";
  return { percentage, status };
}

export function useBudgets(month: number, year: number) {
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: budgetData, error: budgetError } = await supabase
        .from("budgets")
        .select("*")
        .eq("month", month)
        .eq("year", year)
        .order("created_at");

      if (budgetError) {
        console.error("Error fetching budgets:", budgetError);
        setBudgets([]);
        setLoading(false);
        return;
      }

      if (!budgetData || budgetData.length === 0) {
        setBudgets([]);
        setLoading(false);
        return;
      }

      const categoryIds = budgetData.map((b) => b.category_id);

      const { data: transactionData } = await supabase
        .from("transactions")
        .select("category_id, amount")
        .eq("type", "expense")
        .gte("date", `${year}-${String(month).padStart(2, "0")}-01`)
        .lt("date", `${year}-${String(month + 1 > 12 ? 1 : month + 1).padStart(2, "0")}-01`)
        .in("category_id", categoryIds);

      const spentMap: Record<string, number> = {};
      if (transactionData) {
        for (const tx of transactionData) {
          if (tx.category_id) {
            spentMap[tx.category_id] = (spentMap[tx.category_id] || 0) + tx.amount;
          }
        }
      }

      const enriched = budgetData.map((b) => ({
        ...b,
        spent: spentMap[b.category_id] || 0,
      }));

      setBudgets(enriched);
      setLoading(false);
    };

    fetch();
  }, [month, year]);

  const createBudget = async (budget: Omit<Budget, "id" | "user_id" | "created_at" | "updated_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from("budgets")
      .insert({ ...budget, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setBudgets((prev) => [...prev, { ...data, spent: 0 }]);
    return data;
  };

  const updateBudget = async (id: string, patch: Partial<Budget>) => {
    const { error } = await supabase
      .from("budgets")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    setBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b))
    );
  };

  const deleteBudget = async (id: string) => {
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  return { budgets, loading, createBudget, updateBudget, deleteBudget };
}
