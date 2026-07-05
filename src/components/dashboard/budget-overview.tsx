import { useMemo } from "react";
import { motion } from "framer-motion";
import { useBudgets, getBudgetStatus } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, AlertTriangle, CheckCircle2, AlertCircle, Target } from "lucide-react";

interface BudgetOverviewProps {
  month: number;
  year: number;
}

const statusConfig = {
  ok: {
    label: "No limite",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    progressColor: "[&>div]:bg-emerald-500",
  },
  warning: {
    label: "Atenção",
    icon: AlertCircle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    progressColor: "[&>div]:bg-amber-500",
  },
  danger: {
    label: "Limite",
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    progressColor: "[&>div]:bg-red-500",
  },
};

const shorten = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function BudgetOverview({ month, year }: BudgetOverviewProps) {
  const { budgets, loading } = useBudgets(month, year);
  const { categories } = useCategories();

  const getCategoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) || "Sem categoria";
  }, [categories]);

  const getCategoryIcon = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.icon]));
    return (id: string) => map.get(id) || "📁";
  }, [categories]);

  if (loading) {
    return (
    <div className="rounded-lg border border-border/60 bg-card p-4 h-full">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-6">
        <div className="flex flex-col items-center gap-3 text-center py-4">
          <div className="rounded-full border border-border/60 p-3">
            <Target className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Nenhum orçamento definido</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crie orçamentos para controlar seus gastos por categoria
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Visão Geral dos Orçamentos</h3>
      </div>

      <div className="space-y-3">
        {budgets.map((budget, i) => {
          const { percentage, status } = getBudgetStatus(budget, budget.spent);
          const config = statusConfig[status];
          const StatusIcon = config.icon;

          return (
            <motion.div
              key={budget.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{getCategoryIcon(budget.category_id)}</span>
                  <span className="text-xs font-medium">{getCategoryName(budget.category_id)}</span>
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-[10px] gap-1 border-0", config.bg, config.color)}
                >
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>R$ {shorten(budget.spent)}</span>
                <span>R$ {shorten(budget.amount)}</span>
              </div>

              <Progress
                value={Math.min(percentage, 100)}
                className={cn("h-1.5", config.progressColor)}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
