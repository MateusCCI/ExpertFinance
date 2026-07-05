import { useMemo } from "react";
import { motion } from "framer-motion";
import { useGoals } from "@/hooks/use-goals";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Target, Trophy, Calendar } from "lucide-react";

const shorten = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function daysRemaining(deadline: string | null): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
}

export function SavingsGoals() {
  const { goals, loading } = useGoals();

  const activeGoals = useMemo(
    () => goals.filter((g) => !g.is_completed),
    [goals]
  );

  const completedGoals = useMemo(
    () => goals.filter((g) => g.is_completed),
    [goals]
  );

  if (loading) {
    return (
    <div className="rounded-lg border border-border/60 bg-card p-4 h-full">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-6">
        <div className="flex flex-col items-center gap-3 text-center py-4">
          <div className="rounded-full border border-border/60 p-3">
            <Target className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Nenhuma meta definida</p>
            <p className="text-xs text-muted-foreground mt-1">
              Defina metas de economia para acompanhar seu progresso
            </p>
          </div>
          <Button variant="outline" size="sm" className="mt-2 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Criar Meta
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Metas de Economia</h3>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-[10px]">
          <Plus className="h-3 w-3" />
          Meta
        </Button>
      </div>

      <div className="space-y-3">
        {activeGoals.map((goal, i) => {
          const percent = goal.target_amount > 0
            ? Math.round((goal.current_amount / goal.target_amount) * 100)
            : 0;
          const days = daysRemaining(goal.deadline);

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="rounded-lg border border-border/60 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{goal.icon || "🎯"}</span>
                  <span className="text-xs font-medium">{goal.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{percent}%</span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>R$ {shorten(goal.current_amount)}</span>
                <span>R$ {shorten(goal.target_amount)}</span>
              </div>

              <Progress
                value={Math.min(percent, 100)}
                className="h-1.5"
              />

              {days !== null && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {days === 0 ? "Vence hoje" : `${days} dias restantes`}
                </div>
              )}
            </motion.div>
          );
        })}

        {completedGoals.length > 0 && (
          <div className="pt-2 border-t border-border/60">
            <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" />
              Concluídas ({completedGoals.length})
            </p>
            {completedGoals.slice(0, 3).map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-2 py-1 text-[10px] text-muted-foreground"
              >
                <span>{goal.icon || "✅"}</span>
                <span className="line-through">{goal.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
