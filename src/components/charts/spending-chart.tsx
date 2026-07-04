import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

interface SpendingItem {
  name: string;
  amount: number;
  color?: string;
}

interface SpendingChartProps {
  data: SpendingItem[];
  title?: string;
  className?: string;
}

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-card border border-border/60 rounded-lg px-3 py-2 text-xs">
      <p className="font-medium text-foreground">{item.name}</p>
      <p className="text-muted-foreground tabular-nums">{formatCurrency(item.amount)}</p>
    </div>
  );
};

export function SpendingChart({ data, title, className }: SpendingChartProps) {
  if (!data.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={cn("p-3 md:p-5 rounded-lg border border-border/60 bg-card", className)}
    >
      {title && (
        <h3 className="text-xs md:text-sm font-medium text-foreground mb-3 md:mb-4">
          {title}
        </h3>
      )}
      <div className="w-full" style={{ height: Math.max(data.length * 40, 120) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            barCategoryGap={4}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fill: "currentColor", fontSize: 11, className: "text-muted-foreground" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={
                    entry.color ||
                    [
                      "var(--color-chart-1)",
                      "var(--color-chart-2)",
                      "var(--color-chart-3)",
                      "var(--color-chart-4)",
                      "var(--color-chart-5)",
                    ][index % 5]
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
