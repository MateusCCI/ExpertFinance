import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { projectMonthEndBalance } from "@/lib/balance-projection";
import { cn } from "@/lib/utils";
import { Loader2, TrendingUp, TrendingDown, Calendar, DollarSign, Gauge } from "lucide-react";

const shorten = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

interface ProjectionData {
  currentBalance: number;
  projectedBalance: number;
  dailyBurnRate: number;
  daysRemaining: number;
}

export function BalanceProjection() {
  const { user } = useAuth();
  const [data, setData] = useState<ProjectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      try {
        const result = await projectMonthEndBalance(user.id);
        setData(result);
      } catch (err) {
        console.error("Error projecting balance:", err);
        setError("Erro ao calcular projeção");
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-4">
        <div className="flex flex-col items-center gap-3 text-center py-4">
          <p className="text-xs text-muted-foreground">{error || "Dados indisponíveis"}</p>
        </div>
      </div>
    );
  }

  const isPositive = data.projectedBalance >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-border/60 bg-card p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Gauge className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Projeção de Saldo</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            Saldo Atual
          </div>
          <p className="text-sm font-semibold">
            R$ {shorten(data.currentBalance)}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            Projeção Final
          </div>
          <p
            className={cn(
              "text-sm font-semibold",
              isPositive ? "text-emerald-500" : "text-red-500"
            )}
          >
            R$ {shorten(data.projectedBalance)}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <TrendingDown className="h-3 w-3" />
            Gasto Diário Médio
          </div>
          <p className="text-xs text-muted-foreground">
            R$ {shorten(data.dailyBurnRate)}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Dias Restantes
          </div>
          <p className="text-xs text-muted-foreground">
            {data.daysRemaining} {data.daysRemaining === 1 ? "dia" : "dias"}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "mt-4 rounded-md p-2 text-center text-[10px] font-medium border",
          isPositive
            ? "text-emerald-500 bg-emerald-500/5 border-emerald-500/20"
            : "text-red-500 bg-red-500/5 border-red-500/20"
        )}
      >
        {isPositive
          ? `Você fechará o mês com R$ ${shorten(data.projectedBalance)}`
          : `Atenção: saldo negativo projetado de R$ ${shorten(Math.abs(data.projectedBalance))}`}
      </div>
    </motion.div>
  );
}
