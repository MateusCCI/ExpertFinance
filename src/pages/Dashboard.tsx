import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreditCards } from "@/hooks/use-cards";
import { useInvoices } from "@/hooks/use-invoices";
import { useLedger } from "@/hooks/use-ledger";
import { useRent } from "@/hooks/use-rent";
import { useMissions } from "@/hooks/use-missions";
import { useTransactions } from "@/hooks/use-transactions";
import { recalculateAllCardLimits } from "@/lib/card-utils";
import {
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Landmark,
  Users,
  LogOut,
  RefreshCw,
  LayoutDashboard,
  List,
  Settings,
  BarChart3,
  Plus,
  PiggyBank,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Target,
  DollarSign,
  Building,
  Moon,
  Sun,
  Menu,
} from "lucide-react";
import { subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import { QuickExpenseDialog } from "@/components/quick-expense-dialog";
import { MobileHeader } from "@/components/mobile-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Navigate } from "react-router";
import { useAlerts } from "@/hooks/use-alerts";
import logo from "@/assets/logo.svg";
import { BudgetOverview } from "@/components/dashboard/budget-overview";
import { SavingsGoals } from "@/components/dashboard/savings-goals";
import { BalanceProjection } from "@/components/dashboard/balance-projection";
import { SmartInsights } from "@/components/dashboard/smart-insights";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";

const shorten = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

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


export default function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Supabase hooks ──
  const { accounts, loading: accountsLoading } = useAccounts();
  const { cards, loading: cardsLoading } = useCreditCards();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { people, loading: ledgerLoading } = useLedger();
  const { config: rentConfig, loading: rentLoading } = useRent();
  const { missions: bankMissions, progress: missionProgress, loading: missionsLoading } = useMissions();
  const { transactions: allTransactions, loading: txLoading } = useTransactions();
  const { unreadCount } = useAlerts();

  const anyLoading = accountsLoading || cardsLoading || invoicesLoading || ledgerLoading || rentLoading || missionsLoading || txLoading;

  // ── Credit cards ──
  const totalCardLimit = cards.reduce((s, c) => s + (c.total_limit || 0), 0);
  const totalCardUsed = cards.reduce((s, c) => s + Math.max(0, (c.total_limit || 0) - (c.available_limit ?? c.total_limit ?? 0)), 0);

  // ── Ledger (derived from people) ──
  const ledger = useMemo(() => {
    const totalReceivable = people.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
    const totalPayable = people.filter((p) => p.balance < 0).reduce((s, p) => s + Math.abs(p.balance), 0);
    return { totalReceivable, totalPayable, personCount: people.length };
  }, [people]);

  // ── Rent (derived from config + invoices) ──
  const rent = useMemo(() => {
    if (!rentConfig) return { landlordName: "---", monthlyRentAmount: 0, landlordSpending: 0, rentAbatement: 0, residualToPay: 0, isPaid: false };
    const rentAbatement = invoices.reduce((s, i) => s + (i.rent_abatement_amount || 0), 0);
    const residualToPay = rentConfig.monthly_rent_amount - rentAbatement;
    return {
      landlordName: rentConfig.landlord_name,
      monthlyRentAmount: rentConfig.monthly_rent_amount,
      landlordSpending: rentConfig.accumulated_landlord_spending,
      rentAbatement,
      residualToPay,
      isPaid: residualToPay <= 0,
    };
  }, [rentConfig, invoices]);

  // ── Missions (join bankMissions + progress) ──
  const missions = useMemo(() => {
    return bankMissions.map((m) => {
      const prog = missionProgress.find((p) => p.mission_id === m.id);
      return {
        name: m.name,
        completed: prog?.is_completed ?? false,
        bonus: m.bonus_description,
        current: prog?.current_count ?? 0,
        target: prog?.target_count ?? m.trigger_target,
      };
    });
  }, [bankMissions, missionProgress]);

  // ── Installments (derived from credit card transactions) ──
  const installments = useMemo(() => {
    const groups = new Map<string, { count: number; maxPaid: number; amount: number }>();
    allTransactions.forEach((t) => {
      if (t.credit_card_id && t.installment_group_id && t.installment_count && t.installment_count > 1) {
        const existing = groups.get(t.installment_group_id);
        if (existing) {
          existing.maxPaid = Math.max(existing.maxPaid, t.installment_number || 1);
        } else {
          groups.set(t.installment_group_id, {
            count: t.installment_count,
            maxPaid: t.installment_number || 1,
            amount: t.amount,
          });
        }
      }
    });
    return Array.from(groups.values()).map((g) => ({
      remainingAmount: g.amount * (g.count - g.maxPaid),
    }));
  }, [allTransactions]);

  // ── Derived aggregates ──
  const cash = accounts.find((a) => a.type === "cash")?.balance ?? 0;
  const bankBalance = accounts.filter((a) => a.type === "checking").reduce((s, a) => s + a.balance, 0);
  const thirdPartyHeld = ledger.totalPayable;
  const liquidity = cash + bankBalance - thirdPartyHeld;

  const openInvoicesTotal = invoices.filter((i) => !i.is_paid).reduce((s, i) => s + i.total_amount, 0);
  const futureInstallmentsTotal = installments.reduce((s, i) => s + i.remainingAmount, 0);
  const creditUtilization = cards.filter((c) => c.total_limit > 0).map((c) => ({ total: c.total_limit, used: Math.max(0, c.total_limit - c.available_limit) }));
  const totalLimit = creditUtilization.reduce((s, c) => s + c.total, 0);
  const totalUsed = creditUtilization.reduce((s, c) => s + c.used, 0);
  const creditPercent = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  const totalAssets = accounts.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = openInvoicesTotal + ledger.totalPayable + cards.filter((c) => c.total_limit > 0).reduce((s, c) => s + Math.max(0, c.total_limit - c.available_limit), 0);
  const netWorth = totalAssets - totalLiabilities;

  const rentUsedPercent = rent.monthlyRentAmount > 0 ? (rent.rentAbatement / rent.monthlyRentAmount) * 100 : 0;

  const completedMissions = missions.filter((m) => m.completed).length;
  const totalMissionsCount = missions.length;
  const activeBonuses = missions.filter((m) => m.completed).map((m) => m.bonus);

  // ── Trend indicators (vs previous month) ──
  const trends = useMemo(() => {
    const now = new Date();
    const currMonthStart = startOfMonth(now);
    const currMonthEnd = endOfMonth(now);
    const prevDate = subMonths(now, 1);
    const prevMonthStart = startOfMonth(prevDate);
    const prevMonthEnd = endOfMonth(prevDate);

    const currMonthTx = allTransactions.filter((t) =>
      isWithinInterval(parseISO(t.date), { start: currMonthStart, end: currMonthEnd })
    );
    const prevMonthTx = allTransactions.filter((t) =>
      isWithinInterval(parseISO(t.date), { start: prevMonthStart, end: prevMonthEnd })
    );

    // Current month net cash flow (income − cash expenses)
    const currIncome = currMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const currCashExpenses = currMonthTx.filter((t) => t.type === "expense" && !t.credit_card_id).reduce((s, t) => s + t.amount, 0);
    const currNetFlow = currIncome - currCashExpenses;

    // Previous month net cash flow
    const prevIncome = prevMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const prevCashExpenses = prevMonthTx.filter((t) => t.type === "expense" && !t.credit_card_id).reduce((s, t) => s + t.amount, 0);
    const prevNetFlow = prevIncome - prevCashExpenses;

    // Liquidez: current liquidity vs estimated previous (current − this month's net flow)
    const prevLiquidity = liquidity - currNetFlow;
    const liquidityPct = prevLiquidity !== 0 ? ((liquidity - prevLiquidity) / Math.abs(prevLiquidity)) * 100 : 0;

    // Crédito: credit used comparison
    const currCreditUsed = currMonthTx.filter((t) => t.type === "expense" && t.credit_card_id).reduce((s, t) => s + t.amount, 0);
    const prevCreditUsed = prevMonthTx.filter((t) => t.type === "expense" && t.credit_card_id).reduce((s, t) => s + t.amount, 0);
    const creditPct = prevCreditUsed !== 0 ? ((currCreditUsed - prevCreditUsed) / Math.abs(prevCreditUsed)) * 100 : 0;

    // Patrimônio: current net worth vs estimated previous
    const allCurrExpenses = currMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const currTotalFlow = currIncome - allCurrExpenses;
    const prevNetWorth = netWorth - currTotalFlow;
    const netWorthPct = prevNetWorth !== 0 ? ((netWorth - prevNetWorth) / Math.abs(prevNetWorth)) * 100 : 0;

    return { liquidityPct, creditPct, netWorthPct };
  }, [allTransactions, liquidity, netWorth]);

  const getCardName = useCallback((cardId: string) => cards.find((c) => c.id === cardId)?.name ?? "---", [cards]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Recalcular limites uma única vez para corrigir dados inconsistentes
  useEffect(() => {
    if (!cardsLoading && cards.length > 0 && !localStorage.getItem("limits_recalculated")) {
      recalculateAllCardLimits().then(() => {
        localStorage.setItem("limits_recalculated", "1");
        window.location.reload();
      });
    }
  }, [cardsLoading, cards]);

  if (isLoading || anyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — desktop only */}
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
            <img src={logo} alt="ExpertFinance" className="h-5 w-5" />
            {sidebarOpen && <span>Finanças</span>}
          </button>
        </div>
        <nav className="flex-1 py-2 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "transactions") navigate("/transactions");
                if (item.id === "cards") navigate("/cards");
                if (item.id === "ledger") navigate("/ledger");
                if (item.id === "rent") navigate("/rent");
                if (item.id === "accounts") navigate("/accounts");
                if (item.id === "missions") navigate("/missions");
                if (item.id === "reports") navigate("/reports");
                if (item.id === "settings") navigate("/settings");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                item.id === "dashboard"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
              {item.id === "dashboard" && unreadCount > 0 && (
                <span className="ml-auto w-2 h-2 rounded-full bg-red-500 shrink-0" />
              )}
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
        icon={LayoutDashboard}
        title="Dashboard"
        description="Resumo financeiro"
        onRefresh={() => setRefreshKey((k) => k + 1)}
        onPlus={() => setShowQuickExpense(true)}
        plusTitle="Nova transação"
      />

      <MobileBottomNav currentPath="/dashboard" onQuickExpense={() => setShowQuickExpense(true)} />

      {/* Main content — single source of truth */}
      <main className="flex-1 overflow-auto pb-20 md:pb-6">
        <div className="w-full px-3 md:px-8 md:max-w-6xl md:mx-auto py-6 md:py-10">
          {/* ===== ROW 1: 3 metric cards ===== */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6 place-items-stretch"
          >
            {/* CARD 1 — LIQUIDEZ */}
            <div className="p-2 md:p-5 rounded-lg border border-border/60 bg-card relative overflow-hidden h-full">
              <div className="hidden md:block absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-green-500/[0.04] to-transparent rounded-bl-full" />
              <div className="flex items-center justify-between mb-1 md:mb-3">
                <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">Liquidez</span>
                <Wallet className="h-3 w-3 md:h-4 md:w-4 text-green-600/60 shrink-0" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-2xl font-light tracking-tight text-foreground truncate" title={`R$ ${liquidity.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}>
                  R$ {shorten(liquidity)}
                </span>
                {Math.abs(trends.liquidityPct) > 0 && (
                  <span className={`inline-flex items-center gap-0.5 text-[9px] md:text-[10px] font-medium tabular-nums shrink-0 ${trends.liquidityPct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {trends.liquidityPct >= 0 ? <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" /> : <TrendingDown className="h-2.5 w-2.5 md:h-3 md:w-3" />}
                    {trends.liquidityPct >= 0 ? "+" : ""}{trends.liquidityPct.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="flex flex-row flex-wrap text-[7px] md:text-xs leading-tight md:leading-normal text-muted-foreground mt-1 md:mt-3 pt-1 md:pt-3 border-t border-border/20 md:border-border/30 gap-x-1.5">
                <span>Caixa: R$ {shorten(cash)}</span>
                <span>Bancos: R$ {shorten(bankBalance)}</span>
                <span className="text-red-500/70">Terc: R$ {shorten(thirdPartyHeld)}</span>
              </div>
            </div>

            {/* CARD 2 — CRÉDITO */}
            <div className="p-2 md:p-5 rounded-lg border border-border/60 bg-card relative overflow-hidden h-full">
              <div className="hidden md:block absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/[0.04] to-transparent rounded-bl-full" />
              <div className="flex items-center justify-between mb-1 md:mb-3">
                <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">Crédito</span>
                <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-purple-600/60 shrink-0" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-2xl font-light tracking-tight text-foreground truncate" title={`R$ ${totalCardLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}>
                  {totalCardLimit > 0 ? `R$ ${shorten(totalCardLimit)}` : "---"}
                </span>
                {Math.abs(trends.creditPct) > 0 && (
                  <span className={`inline-flex items-center gap-0.5 text-[9px] md:text-[10px] font-medium tabular-nums shrink-0 ${trends.creditPct <= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {trends.creditPct >= 0 ? <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" /> : <TrendingDown className="h-2.5 w-2.5 md:h-3 md:w-3" />}
                    {trends.creditPct >= 0 ? "+" : ""}{trends.creditPct.toFixed(1)}%
                  </span>
                )}
              </div>
              {totalCardLimit > 0 && (
                <>
                  <div className="hidden md:block mt-2">
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500/60" style={{ width: `${Math.min((totalCardUsed / totalCardLimit) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-row flex-wrap text-[7px] md:text-xs leading-tight md:leading-normal text-muted-foreground mt-1 md:mt-3 pt-1 md:pt-3 border-t border-border/20 md:border-border/30 gap-x-1.5">
                    <span>Usado: R$ {shorten(totalCardUsed)}</span>
                    <span>Disp: R$ {shorten(totalCardLimit - totalCardUsed)}</span>
                    {openInvoicesTotal > 0 && <span>Faturas: R$ {shorten(openInvoicesTotal)}</span>}
                    {futureInstallmentsTotal > 0 && <span>Parcelas: R$ {shorten(futureInstallmentsTotal)}</span>}
                  </div>
                </>
              )}
              {totalCardLimit === 0 && (
                <div className="flex flex-row flex-wrap text-[7px] md:text-xs leading-tight md:leading-normal text-muted-foreground mt-1 md:mt-3 pt-1 md:pt-3 border-t border-border/20 md:border-border/30 gap-x-1.5">
                  <span>Faturas: R$ {shorten(openInvoicesTotal)}</span>
                  <span>Parcelas: R$ {shorten(futureInstallmentsTotal)}</span>
                </div>
              )}
            </div>

            {/* CARD 3 — PATRIMÔNIO */}
            <div className="p-2 md:p-5 rounded-lg border border-border/60 bg-card relative overflow-hidden h-full">
              <div className="hidden md:block absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/[0.04] to-transparent rounded-bl-full" />
              <div className="flex items-center justify-between mb-1 md:mb-3">
                <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">Patrimônio</span>
                <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-blue-600/60 shrink-0" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs md:text-2xl font-light tracking-tight truncate ${netWorth >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`} title={`R$ ${netWorth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}>
                  R$ {shorten(netWorth)}
                </span>
                {Math.abs(trends.netWorthPct) > 0 && (
                  <span className={`inline-flex items-center gap-0.5 text-[9px] md:text-[10px] font-medium tabular-nums shrink-0 ${trends.netWorthPct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {trends.netWorthPct >= 0 ? <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" /> : <TrendingDown className="h-2.5 w-2.5 md:h-3 md:w-3" />}
                    {trends.netWorthPct >= 0 ? "+" : ""}{trends.netWorthPct.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="flex flex-row flex-wrap text-[7px] md:text-xs leading-tight md:leading-normal text-muted-foreground mt-1 md:mt-3 pt-1 md:pt-3 border-t border-border/20 md:border-border/30 gap-x-1.5">
                <span className="text-green-600/70">Ativos: R$ {shorten(totalAssets)}</span>
                <span className="text-red-500/70">Passivos: R$ {shorten(totalLiabilities)}</span>
              </div>
            </div>
          </motion.div>

          {/* ===== ROW 2: Limite dinâmico + Locação + Tracker CDI ===== */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6 items-stretch">
            {/* LIMITE DISPONÍVEL DINÂMICO */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="p-3 md:p-5 rounded-lg border border-border/60 bg-card h-full"
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <h3 className="text-xs md:text-sm font-medium text-foreground flex items-center gap-1.5 md:gap-2">
                  <Gauge className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" /> Limite Disponível
                </h3>
                <button onClick={() => navigate("/cards")} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">
                  Gerenciar <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="mb-2 md:mb-4">
                <div className="flex items-center justify-between text-[11px] md:text-xs mb-1">
                  <span className="text-muted-foreground">Utilização total</span>
                  <span className="text-foreground tabular-nums font-medium">
                    R$ {totalUsed.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} / R$ {totalLimit.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <Progress value={creditPercent} className="h-2 md:h-2.5" />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">Disp: R$ {(totalLimit - totalUsed).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                  <span className={`text-[10px] tabular-nums font-medium ${creditPercent > 70 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                    {creditPercent.toFixed(0)}% usado
                  </span>
                </div>
              </div>
              <div className="space-y-1.5 md:space-y-2 pt-2 md:pt-3 border-t border-border/30">
                {cards.filter((c) => c.total_limit > 0).map((card) => {
                  const used = Math.max(0, card.total_limit - card.available_limit);
                  const pct = (used / card.total_limit) * 100;
                  return (
                    <div key={card.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{card.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct > 85 ? "bg-red-500/70" : pct > 70 ? "bg-amber-500/70" : "bg-green-500/60"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="tabular-nums text-muted-foreground w-14 text-right">R$ {card.available_limit.toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* CARD 4 — LOCAÇÃO */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="p-3 md:p-5 rounded-lg border border-border/60 bg-card h-full"
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <h3 className="text-xs md:text-sm font-medium text-foreground flex items-center gap-1.5 md:gap-2"><Building className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" /> Locação</h3>
                <button onClick={() => navigate("/rent")} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">Detalhes <ArrowRight className="h-3 w-3" /></button>
              </div>
              <div className="p-2 md:p-3 rounded-lg bg-muted/30 border border-border/40 mb-2 md:mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] md:text-xs text-muted-foreground">{rent.landlordName}</span>
                  <span className="text-[11px] md:text-xs font-medium text-foreground">R$ {rent.monthlyRentAmount.toFixed(2)}/mês</span>
                </div>
              </div>
              <div className="mb-2 md:mb-3">
                <div className="flex items-center justify-between text-[11px] md:text-xs mb-1">
                  <span className="text-muted-foreground">Abatido via cartão</span>
                  <span className="text-foreground tabular-nums">R$ {rent.rentAbatement.toFixed(2)} / R$ {rent.monthlyRentAmount.toFixed(2)}</span>
                </div>
                <Progress value={rentUsedPercent} className="h-1.5 md:h-2" />
              </div>
              <div className="space-y-1 md:space-y-2 text-[11px] md:text-xs pt-2 md:pt-3 border-t border-border/30">
                <div className="flex items-center justify-between text-muted-foreground"><span>Aluguel</span><span className="tabular-nums">R$ {rent.monthlyRentAmount.toFixed(2)}</span></div>
                <div className="flex items-center justify-between text-green-600 dark:text-green-400"><span>− Consumo</span><span className="tabular-nums">− R$ {rent.landlordSpending.toFixed(2)}</span></div>
                <div className="flex items-center justify-between font-medium text-foreground pt-1 border-t border-border/30">
                  <span>= Saldo Residual</span>
                  <span className={`tabular-nums ${rent.residualToPay > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>R$ {rent.residualToPay.toFixed(2)}</span>
                </div>
              </div>
              {!rent.isPaid && rent.residualToPay > 0 && (
                <Button size="sm" variant="outline" className="w-full mt-2 md:mt-3 text-xs h-7 md:h-8" onClick={() => navigate("/rent")}>
                  <TrendingUp className="mr-1.5 h-3 w-3" /> Pagar
                </Button>
              )}
              {rent.isPaid && (
                <div className="flex items-center gap-1.5 mt-2 md:mt-3 text-[11px] md:text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3 md:h-3.5 md:w-3.5" /> Pago
                </div>
              )}
            </motion.div>

            {/* CARD 5 — TRACKER CDI */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="p-3 md:p-5 rounded-lg border border-border/60 bg-card h-full"
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <h3 className="text-xs md:text-sm font-medium text-foreground flex items-center gap-1.5 md:gap-2"><Target className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" /> Tracker CDI</h3>
                <button onClick={() => navigate("/missions")} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5">Ver <ArrowRight className="h-3 w-3" /></button>
              </div>
              <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-4">
                <div className="relative w-8 h-8 md:w-12 md:h-12 flex items-center justify-center shrink-0">
                  <svg className="w-8 h-8 md:w-12 md:h-12 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-secondary" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${(completedMissions / totalMissionsCount) * 94.2} 94.2`} className="text-green-500" />
                  </svg>
                  <span className="absolute text-[9px] md:text-[10px] font-medium tabular-nums text-foreground">{completedMissions}/{totalMissionsCount}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] md:text-xs font-medium text-foreground">{activeBonuses.length > 0 ? `${activeBonuses.length} bônus` : "Nenhum bônus"}</p>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">{activeBonuses.length > 0 ? activeBonuses.join(", ") : "Complete missões"}</p>
                </div>
              </div>
              <div className="space-y-1 md:space-y-2">
                {missions.map((mission) => {
                  const progressPct = Math.min((mission.current / mission.target) * 100, 100);
                  const isBalanceType = mission.target > 100;
                  return (
                    <div key={mission.name} className={`flex items-center gap-2.5 p-2 rounded-md transition-colors ${mission.completed ? "bg-green-50/50 dark:bg-green-950/20" : "hover:bg-secondary/30"}`}>
                      {mission.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs truncate ${mission.completed ? "text-green-700 dark:text-green-400" : "text-foreground"}`}>{mission.name}</span>
                          {!mission.completed && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">{mission.bonus}</Badge>}
                          {mission.completed && <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 shrink-0">Feito</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${mission.completed ? "bg-green-500/60" : "bg-foreground/20"}`} style={{ width: `${progressPct}%` }} />
                          </div>
                          <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{isBalanceType ? `R$ ${(mission.current as number).toFixed(0)}` : `${mission.current}/${mission.target}`}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* ===== ROW 3: Assets vs Liabilities + Alerts ===== */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 items-stretch mb-4 md:mb-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }} className="p-3 md:p-5 rounded-lg border border-border/60 bg-card h-full">
              <h3 className="text-xs md:text-sm font-medium text-foreground mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2"><PiggyBank className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" /> Ativos</h3>
              <div className="space-y-2 md:space-y-3">
                {accounts.map((acc) => {
                  const pct = totalAssets !== 0 ? (acc.balance / totalAssets) * 100 : 0;
                  const typeLabel = acc.type === "cash" ? "Dinheiro" : acc.type === "checking" ? "Conta Corrente" : acc.type === "investment" ? "Investimento" : acc.type;
                  return (
                    <div key={acc.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-foreground">{acc.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground tabular-nums">R$ {acc.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          <span className="text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${acc.type === "cash" ? "bg-green-500/60" : acc.type === "checking" ? "bg-blue-500/60" : "bg-purple-500/60"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[9px] text-muted-foreground mt-0.5 block">{typeLabel}{acc.annual_yield ? ` • ${acc.annual_yield}% CDI` : ""}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 md:mt-4 pt-2 md:pt-4 border-t border-border/30 flex items-center justify-between text-[11px] md:text-xs">
                <span className="text-muted-foreground">Patrimônio Líquido</span>
                <span className={`font-medium tabular-nums ${netWorth >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>R$ {netWorth.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }} className="p-3 md:p-5 rounded-lg border border-border/60 bg-card h-full">
              <h3 className="text-xs md:text-sm font-medium text-foreground mb-3 md:mb-4 flex items-center gap-1.5 md:gap-2"><Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" /> Alertas</h3>
              <div className="space-y-2 md:space-y-3">
                {invoices.filter((i) => !i.is_paid).map((inv) => (
                  <div key={`${inv.credit_card_id}-${inv.month}-${inv.year}`} className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">Fatura {getCardName(inv.credit_card_id)} — {monthNames[inv.month - 1] ?? "???"}/{inv.year}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">R$ {(inv.total_amount - inv.paid_amount).toFixed(2)} restante • Vence {inv.due_date}</p>
                    </div>
                  </div>
                ))}
                {ledger.totalReceivable > 0 && (
                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
                    <Users className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">Contas a Receber</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">R$ {ledger.totalReceivable.toFixed(2)} de {ledger.personCount} pessoas te devem</p>
                    </div>
                  </div>
                )}
                {futureInstallmentsTotal > 0 && (
                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/30">
                    <CreditCard className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">Parcelas Futuras</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">R$ {futureInstallmentsTotal.toFixed(2)} em {installments.length} compras parceladas</p>
                    </div>
                  </div>
                )}
                {totalMissionsCount - completedMissions > 0 && (
                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/30">
                    <Sparkles className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">Missões Pendentes</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{totalMissionsCount - completedMissions} missão(ões) restante(s) para destravar mais bônus</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* ===== ROW 4: Insights Inteligentes + Projeção ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }}>
              <SmartInsights />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
              <BalanceProjection />
            </motion.div>
          </div>

          {/* ===== ROW 5: Orçamento + Metas ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45 }}>
              <BudgetOverview month={new Date().getMonth() + 1} year={new Date().getFullYear()} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}>
              <SavingsGoals />
            </motion.div>
          </div>


        </div>
      </main>
      </div>

      {/* Quick expense dialog */}
      <QuickExpenseDialog open={showQuickExpense} onOpenChange={setShowQuickExpense} />
    </div>
  );
}
