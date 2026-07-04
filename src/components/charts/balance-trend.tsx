import { useId } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface BalancePoint {
  date: string;
  balance: number;
}

interface BalanceTrendProps {
  data: BalancePoint[];
  className?: string;
}

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-lg px-3 py-2 text-xs">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground tabular-nums">{formatCurrency(payload[0].value)}</p>
    </div>
  );
};

export function BalanceTrend({ data, className }: BalanceTrendProps) {
  const id = useId();
  const gradientId = `balance-gradient-${id}`;

  if (!data.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={cn("p-3 md:p-5 rounded-lg border border-border/60 bg-card", className)}
    >
      <div className="w-full h-[200px] md:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "currentColor", fontSize: 11, className: "text-muted-foreground" }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--color-muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
