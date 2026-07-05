import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreditCards } from "@/hooks/use-cards";
import { useCategories } from "@/hooks/use-categories";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface Insight {
  id: string;
  icon: string;
  text: string;
  severity: "info" | "warning" | "success";
}

const severityConfig = {
  info: {
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
  },
  success: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
  },
};

const shorten = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function SmartInsights() {
  const { transactions, loading: txLoading } = useTransactions();
  const { accounts, loading: accLoading } = useAccounts();
  const { cards, loading: cardsLoading } = useCreditCards();
  const { categories } = useCategories();

  const loading = txLoading || accLoading || cardsLoading;

  const insights = useMemo(() => {
    if (loading || transactions.length === 0) return [];

    const result: Insight[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const expenses = currentMonthTx.filter((t) => t.type === "expense");

    // Insight 1: Maior gasto do mês
    if (expenses.length > 0) {
      const catMap = new Map(categories.map((c) => [c.id, c.name]));
      const spentByCategory = new Map<string, number>();
      expenses.forEach((t) => {
        if (t.category_id) {
          spentByCategory.set(
            t.category_id,
            (spentByCategory.get(t.category_id) || 0) + t.amount
          );
        }
      });

      let topCat = "";
      let topAmount = 0;
      spentByCategory.forEach((amount, catId) => {
        if (amount > topAmount) {
          topAmount = amount;
          topCat = catMap.get(catId) || "Outros";
        }
      });

      if (topCat) {
        result.push({
          id: "top-category",
          icon: "🏷️",
          text: `Seu maior gasto este mês é ${topCat} com R$ ${shorten(topAmount)}`,
          severity: "warning",
        });
      }
    }

    // Insight 2: Comparação com mês passado
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthExpenses = transactions.filter((t) => {
      const d = new Date(t.date);
      return t.type === "expense" && d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    });

    const thisMonthTotal = expenses.reduce((s, t) => s + t.amount, 0);
    const lastMonthTotal = lastMonthExpenses.reduce((s, t) => s + t.amount, 0);

    if (lastMonthTotal > 0) {
      const diff = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
      if (Math.abs(diff) > 5) {
        const direction = diff > 0 ? "mais" : "menos";
        const icon = diff > 0 ? "📈" : "📉";
        result.push({
          id: "month-comparison",
          icon,
          text: `Você gastou ${Math.abs(Math.round(diff))}% ${direction} que o mês passado`,
          severity: diff > 0 ? "warning" : "success",
        });
      }
    }

    // Insight 3: Cartão com limite mais usado
    const activeCards = cards.filter((c) => c.status === "active" && c.total_limit > 0);
    activeCards.forEach((card) => {
      const usedPercent = Math.round(
        ((card.total_limit - card.available_limit) / card.total_limit) * 100
      );
      if (usedPercent >= 70) {
        result.push({
          id: `card-${card.id}`,
          icon: "💳",
          text: `Seu cartão ${card.name} está com ${usedPercent}% do limite usado`,
          severity: usedPercent >= 90 ? "danger" as "warning" : "warning",
        });
      }
    });

    // Insight 4: Vencimento de fatura próximo
    activeCards.forEach((card) => {
      const daysUntilDue = card.due_day - now.getDate();
      if (daysUntilDue > 0 && daysUntilDue <= 7) {
        result.push({
          id: `invoice-${card.id}`,
          icon: "📅",
          text: `Faltam ${daysUntilDue} dias para vencer a fatura do ${card.name}`,
          severity: daysUntilDue <= 3 ? "warning" : "info",
        });
      }
    });

    // Insight 5: Conta com saldo alto
    const investmentAccounts = accounts.filter(
      (a) => a.type === "investment" && a.balance > 0
    );
    if (investmentAccounts.length > 0) {
      const totalInvested = investmentAccounts.reduce((s, a) => s + a.balance, 0);
      result.push({
        id: "investment",
        icon: "💰",
        text: `Você tem R$ ${shorten(totalInvested)} em investimentos`,
        severity: "success",
      });
    }

    return result.slice(0, 5);
  }, [transactions, accounts, cards, categories, loading]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Insights Inteligentes</h3>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">
          Adicione transações para gerar insights personalizados
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Insights Inteligentes</h3>
      </div>

      <div className="space-y-2">
        {insights.map((insight, i) => {
          const config = severityConfig[insight.severity];
          const SeverityIcon = config.icon;

          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3",
                config.bg,
                config.border
              )}
            >
              <span className="text-sm mt-0.5">{insight.icon}</span>
              <p className="text-xs text-foreground leading-relaxed flex-1">
                {insight.text}
              </p>
              <SeverityIcon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", config.color)} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
