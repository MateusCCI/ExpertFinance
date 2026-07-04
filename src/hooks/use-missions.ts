import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface BankMission {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  trigger_target: number;
  trigger_account_type: string | null;
  bonus_type: string;
  bonus_description: string;
  bonus_value: number | null;
  institution: string | null;
  is_active: boolean;
  icon: string | null;
  created_at: string;
}

export interface MissionProgress {
  id: string;
  user_id: string;
  mission_id: string;
  current_count: number;
  target_count: number;
  is_completed: boolean;
  completed_at: string | null;
  year: number;
  month: number;
  target_account_id: string | null;
  bonus_unlocked: boolean;
  created_at: string;
  updated_at: string;
}

export function useMissions() {
  const [missions, setMissions] = useState<BankMission[]>([]);
  const [progress, setProgress] = useState<MissionProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [missRes, progRes] = await Promise.all([
          supabase.from("bank_missions").select("*").eq("is_active", true).order("name"),
          supabase.from("mission_progress").select("*").order("created_at", { ascending: false }),
        ]);

        setMissions(missRes.data || []);
        setProgress(progRes.data || []);
      } catch (err) {
        console.error("Failed to load missions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  const createMission = async (mission: Omit<BankMission, "id" | "created_at">) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from("bank_missions")
      .insert(mission)
      .select()
      .single();

    if (error) throw error;
    setMissions((prev) => [...prev, data]);
    return data;
  };

  const updateMission = async (id: string, patch: Partial<BankMission>) => {
    const { error } = await supabase
      .from("bank_missions")
      .update(patch)
      .eq("id", id);

    if (error) throw error;
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const deleteMission = async (id: string) => {
    const { error } = await supabase
      .from("bank_missions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    setMissions((prev) => prev.filter((m) => m.id !== id));
  };

  const updateProgress = async (missionId: string, currentCount: number) => {
    const now = new Date();
    const existing = progress.find(
      (p) => p.mission_id === missionId && p.year === now.getFullYear() && p.month === now.getMonth() + 1
    );

    const mission = missions.find((m) => m.id === missionId);
    if (!mission) return;

    const isCompleted = currentCount >= mission.trigger_target;

    if (existing) {
      const { error } = await supabase
        .from("mission_progress")
        .update({
          current_count: currentCount,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          bonus_unlocked: isCompleted,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) throw error;
      setProgress((prev) =>
        prev.map((p) =>
          p.id === existing.id
            ? { ...p, current_count: currentCount, is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null, bonus_unlocked: isCompleted }
            : p
        )
      );
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from("mission_progress")
        .insert({
          user_id: user.id,
          mission_id: missionId,
          current_count: currentCount,
          target_count: mission.trigger_target,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          bonus_unlocked: isCompleted,
        })
        .select()
        .single();

      if (error) throw error;
      setProgress((prev) => [data, ...prev]);
    }
  };

  return { missions, progress, loading, createMission, updateMission, deleteMission, updateProgress };
}
