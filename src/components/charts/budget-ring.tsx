import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BudgetRingProps {
  percentage: number;
  label: string;
  color?: string;
  className?: string;
}

export function BudgetRing({ percentage, label, color, className }: BudgetRingProps) {
  const clamped = Math.min(Math.max(percentage, 0), 100);

  const resolvedColor =
    color ||
    (clamped > 90 ? "#ff3d00" : clamped > 70 ? "#ffe600" : "#00ffcc");

  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={cn("flex flex-col items-center gap-2", className)}
    >
      <div className="relative w-20 h-20 md:w-24 md:h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle
            cx="36"
            cy="36"
            r="34"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="text-secondary"
          />
          <motion.circle
            cx="36"
            cy="36"
            r="34"
            fill="none"
            stroke={resolvedColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm md:text-base font-medium tabular-nums text-foreground">
            {Math.round(clamped)}%
          </span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground text-center leading-tight">{label}</span>
    </motion.div>
  );
}
