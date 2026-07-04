import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface CashFlowItem {
  month: string;
  income: number;
  expense: number;
}

interface CashFlowChartProps {
  data: CashFlowItem[];
  className?: string;
}

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-lg px-3 py-2 text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-sm shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {entry.dataKey === "income" ? "Receita" : "Despesa"}:
          </span>
          <span className="text-foreground tabular-nums font-medium">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const CustomLegend = ({ payload }: any) => {
  if (!payload?.length) return null;
  return (
    <div className="flex items-center justify-center gap-4 mt-3">
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div
            className="w-2 h-2 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          {entry.dataKey === "income" ? "Receita" : "Despesa"}
        </div>
      ))}
    </div>
  );
};

export function CashFlowChart({ data, className }: CashFlowChartProps) {
  if (!data.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className={cn("p-3 md:p-5 rounded-lg border border-border/60 bg-card", className)}
    >
      <div className="w-full h-[220px] md:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 0, bottom: 0, left: 0 }} barCategoryGap={6}>
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 11, className: "text-muted-foreground" }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
            <Legend content={<CustomLegend />} />
            <Bar dataKey="income" fill="#00ffcc" radius={[3, 3, 0, 0]} maxBarSize={20} />
            <Bar dataKey="expense" fill="#ff3d00" radius={[3, 3, 0, 0]} maxBarSize={20} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
