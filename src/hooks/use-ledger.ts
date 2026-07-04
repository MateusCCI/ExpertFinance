import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface LedgerPerson {
  id: string;
  user_id: string;
  person_name: string;
  person_nickname: string | null;
  balance: number;
  last_activity_date: string | null;
  notes: string | null;
  sync_status: "synced" | "pending" | "conflict";
  created_at: string;
  updated_at: string;
}

export interface LedgerTransaction {
  id: string;
  user_id: string;
  person_id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

export function useLedger() {
  const [people, setPeople] = useState<LedgerPerson[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [peopleRes, txRes] = await Promise.all([
        supabase.from("third_party_ledger").select("*").order("person_name"),
        supabase.from("ledger_transactions").select("*").order("date", { ascending: false }),
      ]);

      setPeople(peopleRes.data || []);
      setTransactions(txRes.data || []);
      setLoading(false);
    };

    fetch();
  }, []);

  const createPerson = async (person: Omit<LedgerPerson, "id" | "user_id" | "created_at" | "updated_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from("third_party_ledger")
      .insert({ ...person, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setPeople((prev) => [...prev, data].sort((a, b) => a.person_name.localeCompare(b.person_name)));
    return data;
  };

  const updatePerson = async (id: string, patch: Partial<LedgerPerson>) => {
    const { error } = await supabase
      .from("third_party_ledger")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const deletePerson = async (id: string) => {
    const { error } = await supabase
      .from("third_party_ledger")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setPeople((prev) => prev.filter((p) => p.id !== id));
  };

  const createTransaction = async (tx: Omit<LedgerTransaction, "id" | "user_id" | "created_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from("ledger_transactions")
      .insert({ ...tx, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    setTransactions((prev) => [data, ...prev]);

    const delta = tx.type === "credit" ? tx.amount : -tx.amount;
    const person = people.find((p) => p.id === tx.person_id);
    if (person) {
      await updatePerson(tx.person_id, { balance: person.balance + delta });
    }

    return data;
  };

  return { people, transactions, loading, createPerson, updatePerson, deletePerson, createTransaction };
}
