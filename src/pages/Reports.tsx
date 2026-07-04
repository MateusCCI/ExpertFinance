import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { useTheme } from "next-themes";
import { Navigate } from "react-router";
import { QuickExpenseDialog } from "@/components/quick-expense-dialog";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";
import {
  BarChart3,
  LogOut,
  LayoutDashboard,
  List,
  CreditCard,
  Landmark,
  Users,
  Target,
  Settings,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Gauge,
  Moon,
  Sun,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { label: "Transações", icon: List, id: "transactions" },
  { label: "Cartões", icon: CreditCard, id: "cards" },
  { label: "Contas", icon: Wallet, id: "accounts" },
  { label: "Aluguel", icon: Landmark, id: "rent" },
  { label: "Terceiros", icon: Users, id: "ledger" },
  { label: "Missões", icon: Target, id: "missions" },
  { label: "Relatórios", icon: BarChart3, id: "reports" },
  { label: "Configurações", icon: Settings, id: "settings" },
];

const CDI_RATE = 13.75;

export default function ReportsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("performance");
  const [showQuickExpense, setShowQuickExpense] = useState(false);

  const { transactions, loading: txLoading } = useTransactions();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { categories, loading: categoriesLoading } = useCategories();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const loading = txLoading || accountsLoading || categoriesLoading;

  // --- All useMemo hooks MUST be before any early returns ---
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; income: number; expenses: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const ref = subMonths(now, i);
      const monthStart = startOfMonth(ref);
      const monthEnd = endOfMonth(ref);
      const key = format(ref, "yyyy-MM");
      const label = format(ref, "MMM/yy", { locale: ptBR });
      let income = 0;
      let expenses = 0;
      transactions.forEach((tx) => {
        const txDate = parseISO(tx.date);
        if (isWithinInterval(txDate, { start: monthStart, end: monthEnd })) {
          if (tx.type === "income") income += tx.amount;
          else if (tx.type === "expense") expenses += tx.amount;
        }
      });
      months.push({ key, label, income, expenses });
    }
    return months.map((m) => ({ ...m, balance: m.income - m.expenses }));
  }, [transactions]);

  const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
  const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
  const positiveMonths = monthlyData.filter((m) => m.balance > 0).length;
  const avgBalance = monthlyData.length > 0
    ? monthlyData.reduce((s, m) => s + m.balance, 0) / monthlyData.length : 0;

  const accountYieldData = useMemo(() => {
    return accounts
      .filter((a) => a.annual_yield && a.annual_yield > 0)
      .map((a) => {
        const annualPct = (a.annual_yield! / 100) * CDI_RATE;
        const monthlyYield = a.balance * (annualPct / 100) / 12;
        return { name: a.name, type: a.type, annualYield: a.annual_yield!, annualPct, balance: a.balance, monthlyYield };
      })
      .sort((a, b) => b.annualYield - a.annualYield);
  }, [accounts]);

  const bestAccount = accountYieldData.length > 0 ? accountYieldData[0] : null;

  const spendingPeaks = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const currentByCat: Record<string, number> = {};
    const last3ByCat: Record<string, number[]> = {};
    for (let i = 0; i < 3; i++) {
      const ref = subMonths(now, i + 1);
      const ms = startOfMonth(ref);
      const me = endOfMonth(ref);
      transactions.forEach((tx) => {
        if (tx.type !== "expense" || !tx.category_id) return;
        const txDate = parseISO(tx.date);
        if (isWithinInterval(txDate, { start: ms, end: me })) {
          if (!last3ByCat[tx.category_id]) last3ByCat[tx.category_id] = [];
          last3ByCat[tx.category_id].push(tx.amount);
        }
      });
    }
    transactions.forEach((tx) => {
      if (tx.type !== "expense" || !tx.category_id) return;
      const txDate = parseISO(tx.date);
      if (isWithinInterval(txDate, { start: currentMonthStart, end: currentMonthEnd })) {
        currentByCat[tx.category_id] = (currentByCat[tx.category_id] || 0) + tx.amount;
      }
    });
    const catIds = new Set([...Object.keys(currentByCat), ...Object.keys(last3ByCat)]);
    const results: { category: string; current: number; avg: number; variance: number; peak: boolean }[] = [];
    catIds.forEach((catId) => {
      const current = currentByCat[catId] || 0;
      const history = last3ByCat[catId] || [];
      const avg = history.length > 0 ? history.reduce((s, v) => s + v, 0) / history.length : current;
      const variance = avg > 0 ? ((current - avg) / avg) * 100 : 0;
      results.push({ category: categoryMap[catId] || "Sem categoria", current, avg, variance, peak: variance > 20 });
    });
    return results.sort((a, b) => b.current - a.current);
  }, [transactions, categoryMap]);

  const reserveFund = useMemo(() => {
    if (!bestAccount) return null;
    const monthlyAmount = totalIncome > 0 ? totalIncome / monthlyData.filter((m) => m.income > 0).length * 0.1 : 0;
    const monthlyGain = monthlyAmount * (bestAccount.annualPct / 100) / 12;
    return {
      accountName: bestAccount.name, yield: bestAccount.annualYield, annualPct: bestAccount.annualPct,
      monthlyAmount, monthlyGain,
      reason: `Com 10% da renda (R$ ${formatCurrency(monthlyAmount)}/mês) em ${bestAccount.name} a ${bestAccount.annualYield}% CDI, você pode ganhar aproximadamente R$ ${formatCurrency(monthlyGain)}/mês em rendimentos passivos.`,
    };
  }, [bestAccount, totalIncome, monthlyData]);

  const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

  // --- Early returns AFTER all hooks ---
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando relatórios...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-56" : "w-14"
        } border-r border-border/50 bg-background flex-col transition-all duration-200 hidden md:flex`}
      >
        <div className="h-14 flex items-center px-4 border-b border-border/50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2"
          >
            <Wallet className="h-4 w-4" />
            {sidebarOpen && <span>Finanças</span>}
          </button>
        </div>
        <nav className="flex-1 py-2 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "dashboard") navigate("/dashboard");
                if (item.id === "transactions") navigate("/transactions");
                if (item.id === "cards") navigate("/cards");
                if (item.id === "ledger") navigate("/ledger");
                if (item.id === "rent") navigate("/rent");
                if (item.id === "accounts") navigate("/accounts");
                if (item.id === "missions") navigate("/missions");
                if (item.id === "settings") navigate("/settings");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                item.id === "reports"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-border/50 space-y-1">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {sidebarOpen && <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>}
          </button>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col md:pt-0 min-h-screen">
        <MobileHeader
          icon={BarChart3}
          title="Relatórios"
          description="Análise de receitas e despesas"
          onRefresh={() => {}}
          onPlus={() => setShowQuickExpense(true)}
          plusTitle="Nova transação"
        />

        <MobileBottomNav currentPath="/reports" onQuickExpense={() => setShowQuickExpense(true)} />

        <main className="flex-1 overflow-auto pb-20 md:pb-6">
          <div className="w-full px-3 md:px-8 md:max-w-6xl md:mx-auto py-6 md:py-10">
            {/* Summary cards */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="grid grid-cols-2 gap-1.5 md:gap-3 mb-4 md:mb-6"
            >
              <div className="p-2 md:p-4 rounded-lg border border-border/60 bg-card min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] md:text-[11px] text-muted-foreground truncate">Receita (12m)</span>
                  <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 text-green-600/70 shrink-0" />
                </div>
                <span className="text-xs md:text-lg font-light tracking-tight truncate block">
                  R$ {formatCurrency(totalIncome)}
                </span>
              </div>
              <div className="p-2 md:p-4 rounded-lg border border-border/60 bg-card min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] md:text-[11px] text-muted-foreground truncate">Despesa (12m)</span>
                  <TrendingDown className="h-3 w-3 md:h-3.5 md:w-3.5 text-red-600/70 shrink-0" />
                </div>
                <span className="text-xs md:text-lg font-light tracking-tight truncate block">
                  R$ {formatCurrency(totalExpenses)}
                </span>
              </div>
              <div className="p-2 md:p-4 rounded-lg border border-border/60 bg-card min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] md:text-[11px] text-muted-foreground truncate">Saldo Médio</span>
                  <Wallet className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground shrink-0" />
                </div>
                <span className="text-xs md:text-lg font-light tracking-tight truncate block">
                  R$ {formatCurrency(avgBalance)}
                </span>
              </div>
              <div className="p-2 md:p-4 rounded-lg border border-border/60 bg-card min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] md:text-[11px] text-muted-foreground truncate">Meses +</span>
                  <Gauge className={`h-3 w-3 md:h-3.5 md:w-3.5 shrink-0 ${positiveMonths >= 10 ? "text-green-600/70" : "text-amber-500/70"}`} />
                </div>
                <span className="text-xs md:text-lg font-light tracking-tight truncate block">
                  {positiveMonths}/{monthlyData.length}
                </span>
              </div>
            </motion.div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 md:mb-6 w-full overflow-x-auto">
                <TabsTrigger value="performance" className="text-[10px] md:text-xs gap-1 md:gap-1.5 px-2 md:px-3">
                  <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 hidden md:block" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="yields" className="text-[10px] md:text-xs gap-1 md:gap-1.5 px-2 md:px-3">
                  <PiggyBank className="h-3 w-3 md:h-3.5 md:w-3.5 hidden md:block" />
                  Rentabilidade
                </TabsTrigger>
                <TabsTrigger value="peaks" className="text-[10px] md:text-xs gap-1 md:gap-1.5 px-2 md:px-3">
                  <AlertTriangle className="h-3 w-3 md:h-3.5 md:w-3.5 hidden md:block" />
                  Picos
                </TabsTrigger>
                <TabsTrigger value="reserve" className="text-[10px] md:text-xs gap-1 md:gap-1.5 px-2 md:px-3">
                  <Target className="h-3 w-3 md:h-3.5 md:w-3.5 hidden md:block" />
                  Reserva
                </TabsTrigger>
              </TabsList>

              {/* Performance Tab */}
              <TabsContent value="performance">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-lg border border-border/60 bg-card"
                >
                  <div className="px-3 md:px-5 py-3 md:py-4 border-b border-border/30">
                    <h3 className="text-xs md:text-sm font-medium text-foreground">
                      Performance Mensal — Últimos 12 Meses
                    </h3>
                  </div>
                  <div className="p-3 md:p-5">
                    {monthlyData.some((m) => m.income > 0 || m.expenses > 0) ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip
                            formatter={(value: number) => `R$ ${formatCurrency(value)}`}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="income" name="Receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expenses" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <BarChart3 className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">Nenhuma transação encontrada nos últimos 12 meses</p>
                      </div>
                    )}
                  </div>
                  <div className="divide-y divide-border/30">
                    {monthlyData.map((m, i) => (
                      <div key={i} className="px-3 md:px-5 py-2 md:py-3 hover:bg-secondary/20 transition-colors">
                        <div className="flex items-center justify-between mb-1.5 md:mb-2">
                          <span className="text-[11px] md:text-xs font-medium text-foreground capitalize">{m.label}</span>
                          <span className={`text-xs font-medium tabular-nums ${
                            m.balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          }`}>
                            {m.balance >= 0 ? "+" : ""}R$ {formatCurrency(m.balance)}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] md:text-[10px] text-green-600/70 w-8 md:w-10 shrink-0">Receita</span>
                            <div className="flex-1 h-1.5 md:h-2 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-green-500/60 rounded-full transition-all"
                                style={{ width: `${monthlyData.length > 0 && Math.max(...monthlyData.map((p) => Math.max(p.income, p.expenses))) > 0 ? (m.income / Math.max(...monthlyData.map((p) => Math.max(p.income, p.expenses)))) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-[9px] md:text-[10px] text-muted-foreground tabular-nums w-16 md:w-20 text-right">
                              R$ {formatCurrency(m.income)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] md:text-[10px] text-red-600/70 w-8 md:w-10 shrink-0">Despesa</span>
                            <div className="flex-1 h-1.5 md:h-2 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-red-500/60 rounded-full transition-all"
                                style={{ width: `${monthlyData.length > 0 && Math.max(...monthlyData.map((p) => Math.max(p.income, p.expenses))) > 0 ? (m.expenses / Math.max(...monthlyData.map((p) => Math.max(p.income, p.expenses)))) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-[9px] md:text-[10px] text-muted-foreground tabular-nums w-16 md:w-20 text-right">
                              R$ {formatCurrency(m.expenses)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </TabsContent>

              {/* Yields Tab */}
              <TabsContent value="yields">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-lg border border-border/60 bg-card"
                >
                  <div className="px-3 md:px-5 py-3 md:py-4 border-b border-border/30">
                    <h3 className="text-xs md:text-sm font-medium text-foreground">
                      Comparativo de Rentabilidade entre Contas
                    </h3>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                      CDI referência: {CDI_RATE}% ao ano
                    </p>
                  </div>
                  <div className="p-3 md:p-5">
                    {accountYieldData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={accountYieldData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} unit="%" />
                          <Tooltip
                            formatter={(value: number, name: string) => {
                              if (name === "annualPct") return [`${value.toFixed(2)}%`, "% CDI real"];
                              return [`R$ ${formatCurrency(value)}`, name];
                            }}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          />
                          <Bar dataKey="annualPct" name="annualPct" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <PiggyBank className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">Nenhuma conta com rendimento configurado</p>
                      </div>
                    )}
                  </div>
                  <div className="divide-y divide-border/30">
                    {accountYieldData.map((acc, i) => (
                      <div key={i} className="px-3 md:px-5 py-3 md:py-4 hover:bg-secondary/20 transition-colors">
                        <div className="flex items-start justify-between mb-2 md:mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs md:text-sm font-medium text-foreground">{acc.name}</p>
                              {i === 0 && (
                                <Badge variant="secondary" className="text-[10px] border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
                                  Melhor para reserva
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {acc.type === "checking" ? "Conta Corrente" : acc.type === "investment" ? "Investimento" : acc.type === "savings" ? "Poupança" : acc.type}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium tabular-nums text-foreground">{acc.annualYield}% CDI</p>
                            <p className="text-xs text-muted-foreground">R$ {formatCurrency(acc.balance)}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-16 shrink-0">CDI real</span>
                            <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${i === 0 ? "bg-green-500/70" : "bg-primary/40"}`}
                                style={{ width: `${(acc.annualPct / CDI_RATE) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] tabular-nums text-muted-foreground w-16 text-right">{acc.annualPct.toFixed(2)}%</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Rendimento mensal estimado</span>
                            <span className="tabular-nums font-medium text-foreground">
                              +R$ {formatCurrency(acc.monthlyYield)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </TabsContent>

              {/* Spending Peaks Tab */}
              <TabsContent value="peaks">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="rounded-lg border border-border/60 bg-card"
                >
                  <div className="px-3 md:px-5 py-3 md:py-4 border-b border-border/30">
                    <h3 className="text-xs md:text-sm font-medium text-foreground">
                      Gastos por Categoria vs Média Móvel (3 meses)
                    </h3>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                      Categorias com variação acima de 20% são marcadas como <span className="text-red-500">pico</span>
                    </p>
                  </div>
                  <div className="p-3 md:p-5">
                    {spendingPeaks.length > 0 ? (
                      <ResponsiveContainer width="100%" height={Math.max(250, spendingPeaks.length * 45)}>
                        <BarChart data={spendingPeaks} layout="vertical" margin={{ top: 10, right: 10, left: 50, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
                          <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={60} />
                          <Tooltip
                            formatter={(value: number, name: string) => [`R$ ${formatCurrency(value)}`, name === "current" ? "Atual" : "Média 3m"]}
                            contentStyle={{ fontSize: 12, borderRadius: 8 }}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => v === "current" ? "Atual" : "Média 3m"} />
                          <Bar dataKey="current" name="current" fill="#ef4444" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="avg" name="avg" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">Nenhuma despesa categorizada encontrada</p>
                      </div>
                    )}
                  </div>
                  <div className="divide-y divide-border/30">
                    {spendingPeaks.map((cat, i) => {
                      const maxAmount = Math.max(...spendingPeaks.map((c) => Math.max(c.current, c.avg)), 1);
                      const currentBar = (cat.current / maxAmount) * 100;
                      const avgBar = (cat.avg / maxAmount) * 100;

                      return (
                        <div key={i} className="px-3 md:px-5 py-3 md:py-4 hover:bg-secondary/20 transition-colors">
                          <div className="flex items-center justify-between mb-2 md:mb-3">
                            <div className="flex items-center gap-2">
                              <p className="text-xs md:text-sm font-medium text-foreground">{cat.category}</p>
                              {cat.peak && (
                                <Badge variant="outline" className="text-[10px] border-red-300 dark:border-red-800 text-red-600 dark:text-red-400">
                                  Pico
                                </Badge>
                              )}
                            </div>
                            <span className={`text-xs font-medium tabular-nums ${
                              cat.variance > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                            }`}>
                              {cat.variance > 0 ? "+" : ""}{cat.variance.toFixed(1)}% vs média
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-red-600/70 w-12 shrink-0">Atual</span>
                              <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${cat.peak ? "bg-red-500/70" : "bg-primary/40"}`}
                                  style={{ width: `${currentBar}%` }}
                                />
                              </div>
                              <span className="text-[10px] tabular-nums text-muted-foreground w-20 text-right">
                                R$ {formatCurrency(cat.current)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground w-12 shrink-0">Média</span>
                              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-muted-foreground/30 rounded-full transition-all"
                                  style={{ width: `${avgBar}%` }}
                                />
                              </div>
                              <span className="text-[10px] tabular-nums text-muted-foreground w-20 text-right">
                                R$ {formatCurrency(cat.avg)}
                              </span>
                            </div>
                          </div>
                          {cat.peak && (
                            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              Gasto {cat.variance > 50 ? "muito" : ""} acima da média — verificar sazonalidade ou revisar orçamento
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </TabsContent>

              {/* Reserve Fund Tab */}
              <TabsContent value="reserve">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="p-3 md:p-5 rounded-lg border border-border/60 bg-card"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-medium text-foreground">
                        Direcionamento Inteligente
                      </h3>
                    </div>

                    {reserveFund ? (
                      <>
                        <div className="p-4 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 mb-4">
                          <p className="text-sm text-foreground leading-relaxed">
                            {reserveFund.reason}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="p-3 rounded-lg bg-secondary/30">
                            <p className="text-[11px] text-muted-foreground mb-1">Conta recomendada</p>
                            <p className="text-sm font-medium text-foreground">{reserveFund.accountName}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-secondary/30">
                            <p className="text-[11px] text-muted-foreground mb-1">Rendimento</p>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">{reserveFund.yield}% CDI ({reserveFund.annualPct.toFixed(2)}% a.a.)</p>
                          </div>
                          <div className="p-3 rounded-lg bg-secondary/30">
                            <p className="text-[11px] text-muted-foreground mb-1">Reserva mensal (10% renda)</p>
                            <p className="text-sm font-medium text-foreground">R$ {formatCurrency(reserveFund.monthlyAmount)}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-secondary/30">
                            <p className="text-[11px] text-muted-foreground mb-1">Ganho mensal est.</p>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">+R$ {formatCurrency(reserveFund.monthlyGain)}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 rounded-lg bg-secondary/30 mb-4">
                        <p className="text-sm text-muted-foreground">
                          Adicione contas com rendimento (annual_yield) configurado para ver recomendações.
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      O fundo de reserva é separado antes do abatimento das despesas variáveis. A recomendação considera a conta com maior CDI disponível.
                    </p>
                  </motion.div>

                  {/* Yield ranking */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="p-3 md:p-5 rounded-lg border border-border/60 bg-card"
                  >
                    <h3 className="text-xs md:text-sm font-medium text-foreground mb-3 md:mb-4 flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
                      Ranking de CDI
                    </h3>

                    {accountYieldData.length > 0 ? (
                      <>
                        <div className="space-y-3">
                          {accountYieldData.map((acc, i) => (
                            <div
                              key={i}
                              className={`p-3 rounded-lg ${
                                i === 0
                                  ? "bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                                  : "bg-secondary/30"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-muted-foreground">#{i + 1}</span>
                                  <span className="text-sm font-medium text-foreground">{acc.name}</span>
                                </div>
                                <span className={`text-sm font-medium tabular-nums ${
                                  i === 0 ? "text-green-600 dark:text-green-400" : "text-foreground"
                                }`}>
                                  {acc.annualYield}% CDI
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Saldo: R$ {formatCurrency(acc.balance)}</span>
                                <span>~R$ {formatCurrency(acc.monthlyYield)}/mês</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-border/30">
                          <p className="text-xs text-muted-foreground">
                            {bestAccount && bestAccount.annualYield >= 120
                              ? "Você já tem acesso a CDI acima de 120% — ótimo! Direcione o fundo de reserva para esta conta."
                              : "Busque contas com CDI acima de 100% para maximizar o rendimento do fundo de reserva."}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <TrendingUp className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">Nenhuma conta com rendimento configurado</p>
                      </div>
                    )}
                  </motion.div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Summary footer */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="mt-6 p-5 rounded-lg border border-border/60 bg-muted/20"
            >
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Sobre este relatório
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-foreground/5 border border-border/60 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-medium">1</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">Performance</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Receitas, despesas e saldo mês a mês nos últimos 12 meses
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-foreground/5 border border-border/60 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-medium">2</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">Rentabilidade</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Comparativo de CDI entre contas para direcionar onde manter o dinheiro
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-foreground/5 border border-border/60 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-medium">3</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">Picos vs Média</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Gastos atuais de cada categoria comparados com a média dos últimos 3 meses
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>

      <QuickExpenseDialog open={showQuickExpense} onOpenChange={setShowQuickExpense} />
    </div>
  );
}
