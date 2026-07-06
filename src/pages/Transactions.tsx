import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useAccounts } from "@/hooks/use-accounts";
import { useTransactions, Transaction } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { useCreditCards } from "@/hooks/use-cards";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { useTheme } from "next-themes";
import { Navigate } from "react-router";
import { toast } from "sonner";
import { QuickExpenseDialog } from "@/components/quick-expense-dialog";
import {
  List,
  LogOut,
  LayoutDashboard,
  CreditCard,
  Landmark,
  Target,
  Users,
  Settings,
  BarChart3,
  Wallet,
  Plus,
  Pencil,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Receipt,

  MoreHorizontal,
  Search,
  Filter,
  RefreshCw,
  Moon,
  Sun,
  TrendingUp,
  TrendingDown,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
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


function getCategoryIcon(categoryId: string | null, categories: { id: string; name: string; color: string | null }[]) {
  if (!categoryId) return <Receipt className="h-3.5 w-3.5" />;
  const cat = categories.find((c) => c.id === categoryId);
  if (cat?.color) return <span className="inline-block size-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />;
  return <Receipt className="h-3.5 w-3.5" />;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function SingleTransactionRow({ tx, index, categories, accounts, cards, onEdit, onDelete }: {
  tx: Transaction;
  index: number;
  categories: { id: string; name: string; color: string | null }[];
  accounts: { id: string; name: string }[];
  cards: { id: string; name: string }[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  const getAccountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "—";
  const getCategoryName = (id: string | null) => id ? categories.find((c) => c.id === id)?.name ?? "—" : "—";
  const getCardName = (id: string | null) => id ? cards.find((c) => c.id === id)?.name ?? null : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.02 * index }}
      className="p-4 md:p-5 hover:bg-secondary/20 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            tx.type === "income" ? "bg-green-50 dark:bg-green-950/30"
              : tx.type === "expense" ? "bg-red-50 dark:bg-red-950/30"
                : "bg-blue-50 dark:bg-blue-950/30"
          }`}>
            {tx.type === "income" ? <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
              : tx.type === "expense" ? <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                : <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {getCategoryIcon(tx.category_id, categories)}
                {getCategoryName(tx.category_id)}
              </div>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">{getAccountName(tx.account_id)}</span>
              {getCardName(tx.credit_card_id) && (
                <>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span className="text-[10px] text-muted-foreground">{getCardName(tx.credit_card_id)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onEdit(tx)} className="p-1.5 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-secondary/50 transition-colors" title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(tx.id)} className="p-1.5 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title="Excluir">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <span className={`text-sm font-medium tabular-nums ${
            tx.type === "income" ? "text-green-600 dark:text-green-400"
              : tx.type === "expense" ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
          }`}>
            {tx.type === "income" ? "+" : tx.type === "expense" ? "−" : ""}R$ {formatCurrency(tx.amount)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function InstallmentGroupCard({ group, isExpanded, onToggle, index, categories, accounts, cards, onEdit, onDelete }: {
  group: any;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
  categories: { id: string; name: string; color: string | null }[];
  accounts: { id: string; name: string }[];
  cards: { id: string; name: string }[];
  onEdit: (tx: any) => void;
  onDelete: (id: string) => void;
}) {
  const progress = group.installmentCount > 0 ? (group.paidCount / group.installmentCount) * 100 : 0;
  const remaining = (group.installmentCount - group.paidCount) * group.amount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.02 * index }}
      className="hover:bg-secondary/20 transition-colors"
    >
      <button onClick={onToggle} className="w-full p-4 md:p-5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              group.type === "income" ? "bg-green-50 dark:bg-green-950/30"
                : group.type === "expense" ? "bg-red-50 dark:bg-red-950/30"
                  : "bg-blue-50 dark:bg-blue-950/30"
            }`}>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">{group.description}</p>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {group.paidCount}/{group.installmentCount}x
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">R$ {formatCurrency(group.amount)}/mês</span>
                <span className="text-[10px] text-muted-foreground">•</span>
                <span className="text-[10px] text-muted-foreground">R$ {formatCurrency(remaining)} restante</span>
              </div>
              <div className="mt-2 w-full max-w-[200px]">
                <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-sm font-medium tabular-nums ${
              group.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}>
              {group.type === "income" ? "+" : "−"}R$ {formatCurrency(group.totalAmount)}
            </span>
            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 divide-y divide-border/20">
              {group.installments.map((inst: any) => (
                <div key={inst.id} className="px-4 md:px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground w-6 text-center">
                      {inst.installment_number}/{group.installmentCount}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(inst.date)}</span>
                    <Badge
                      variant={inst.status === "paid" ? "secondary" : inst.status === "current" ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {inst.status === "paid" ? "Pago" : inst.status === "current" ? "Atual" : "Futuro"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium tabular-nums">R$ {formatCurrency(inst.amount)}</span>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(inst); }} className="p-1 rounded text-muted-foreground/50 hover:text-foreground">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(inst.id); }} className="p-1 rounded text-muted-foreground/50 hover:text-red-500">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function useInstallmentGroups(transactions: Transaction[]) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groupedItems = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    const singles: Transaction[] = [];

    transactions.forEach((tx) => {
      if (tx.installment_group_id && tx.installment_count && tx.installment_count > 1) {
        const group = groups.get(tx.installment_group_id) || [];
        group.push(tx);
        groups.set(tx.installment_group_id, group);
      } else {
        singles.push(tx);
      }
    });

    const groupCards = Array.from(groups.entries()).map(([groupId, txs]) => {
      const sorted = [...txs].sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0));
      const first = sorted[0];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const installments = sorted.map((tx) => {
        const txDate = new Date(tx.date);
        let status: "paid" | "current" | "future" = "future";
        if (txDate < today) status = "paid";
        else if (txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear()) status = "current";
        return { ...tx, status };
      });

      const paidCount = installments.filter((i) => i.status === "paid").length;

      return {
        id: groupId,
        type: first.type,
        description: first.description,
        amount: first.amount,
        installmentCount: first.installment_count!,
        installments,
        paidCount,
        totalAmount: first.amount * first.installment_count!,
        account_id: first.account_id,
        credit_card_id: first.credit_card_id,
        category_id: first.category_id,
      };
    });

    const allItems: Array<{ type: "single" | "group"; data: any }> = [
      ...groupCards.map((g) => ({ type: "group" as const, data: g })),
      ...singles.map((s) => ({ type: "single" as const, data: s })),
    ];

    return allItems.sort((a, b) => {
      const dateA = a.type === "group" ? a.data.installments[0]?.date : a.data.date;
      const dateB = b.type === "group" ? b.data.installments[0]?.date : b.data.date;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [transactions]);

  const toggleGroup = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return { groupedItems, expandedGroups: expanded, toggleGroup };
}

export default function TransactionsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showQuickExpense, setShowQuickExpense] = useState(false);

  const { categories, createCategory } = useCategories();
  const { accounts } = useAccounts();
  const { cards, updateCardLimit } = useCreditCards();
  const { transactions, loading: transactionsLoading, createTransaction, updateTransaction, deleteTransaction } = useTransactions();

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<string | null>(null);
  const [editType, setEditType] = useState<"expense" | "income">("expense");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editCardId, setEditCardId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const deleteConfirmRef = useRef(deleteConfirmId);
  useEffect(() => { deleteConfirmRef.current = deleteConfirmId; }, [deleteConfirmId]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || transactionsLoading) {
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

  const getAccountName = (accountId: string) =>
    accounts.find((a) => a.id === accountId)?.name ?? "—";
  const getCategoryName = (categoryId: string | null) =>
    categoryId ? categories.find((c) => c.id === categoryId)?.name ?? "—" : "—";
  const getCardName = (cardId: string | null) =>
    cardId ? cards.find((c) => c.id === cardId)?.name ?? null : null;

  const filteredTransactions = transactions.filter((t) => {
    const accountName = getAccountName(t.account_id).toLowerCase();
    const categoryName = getCategoryName(t.category_id).toLowerCase();
    const matchesSearch =
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      categoryName.includes(searchQuery.toLowerCase()) ||
      accountName.includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "income" && t.type === "income") ||
      (activeTab === "expense" && t.type === "expense") ||
      (activeTab === "transfer" && t.type === "transfer");
    return matchesSearch && matchesTab;
  });

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalTransfer = transactions.filter((t) => t.type === "transfer").reduce((s, t) => s + t.amount, 0);

  // ── Agrupar parcelas ──
  const { groupedItems, expandedGroups, toggleGroup } = useInstallmentGroups(filteredTransactions);

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
                if (item.id === "cards") navigate("/cards");
                if (item.id === "ledger") navigate("/ledger");
                if (item.id === "rent") navigate("/rent");
                if (item.id === "accounts") navigate("/accounts");
                if (item.id === "missions") navigate("/missions");
                if (item.id === "reports") navigate("/reports");
                if (item.id === "settings") navigate("/settings");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                item.id === "transactions"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-border/50">
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
        icon={List}
        title="Transações"
        description="Todas as movimentações"
        onRefresh={() => {}}
        onPlus={() => setShowQuickExpense(true)}
        plusTitle="Nova transação"
      />

      <MobileBottomNav currentPath="/transactions" onQuickExpense={() => setShowQuickExpense(true)} />

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-6">
        <div className="w-full px-3 md:px-8 md:max-w-6xl md:mx-auto py-6 md:py-10">
          {/* Summary cards */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="grid grid-cols-3 gap-2 md:gap-3 mb-6"
          >
            <div className="p-4 rounded-lg border border-border/60 bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground">Receitas</span>
                <TrendingUp className="h-3.5 w-3.5 text-green-600/70" />
              </div>
              <span className="text-lg font-light tracking-tight text-green-700 dark:text-green-400">
                +R$ {formatCurrency(totalIncome)}
              </span>
            </div>
            <div className="p-4 rounded-lg border border-border/60 bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground">Despesas</span>
                <TrendingDown className="h-3.5 w-3.5 text-red-600/70" />
              </div>
              <span className="text-lg font-light tracking-tight text-red-700 dark:text-red-400">
                -R$ {formatCurrency(totalExpense)}
              </span>
            </div>
            <div className="p-4 rounded-lg border border-border/60 bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground">Transferências</span>
                <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-lg font-light tracking-tight">
                R$ {formatCurrency(totalTransfer)}
              </span>
            </div>
          </motion.div>

          {/* Search and tabs */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-6"
          >
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-base md:text-sm"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1 text-xs">Todas</TabsTrigger>
                <TabsTrigger value="income" className="flex-1 text-xs">Receitas</TabsTrigger>
                <TabsTrigger value="expense" className="flex-1 text-xs">Despesas</TabsTrigger>
                <TabsTrigger value="transfer" className="flex-1 text-xs">Transferências</TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Transaction list */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-lg border border-border/60 bg-card"
          >
            {groupedItems.length === 0 ? (
              <div className="p-10 text-center">
                <List className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma transação encontrada</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => setShowQuickExpense(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Nova transação
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {groupedItems.map((item, i) => (
                  item.type === "group" ? (
                    <InstallmentGroupCard
                      key={item.data.id}
                      group={item.data}
                      isExpanded={expandedGroups.has(item.data.id)}
                      onToggle={() => toggleGroup(item.data.id)}
                      index={i}
                      categories={categories}
                      accounts={accounts}
                      cards={cards}
                      onEdit={(tx) => {
                        setEditingTx(tx.id);
                        setEditType(tx.type as "expense" | "income");
                        setEditAmount(String(tx.amount));
                        setEditDescription(tx.description);
                        setEditCategoryId(tx.category_id || "");
                        setEditAccountId(tx.account_id);
                        setEditCardId(tx.credit_card_id || "");
                        setEditNotes(tx.notes || "");
                      }}
                      onDelete={(id) => setDeleteConfirmId(id)}
                    />
                  ) : (
                    <SingleTransactionRow
                      key={item.data.id}
                      tx={item.data}
                      index={i}
                      categories={categories}
                      accounts={accounts}
                      cards={cards}
                      onEdit={(tx) => {
                        setEditingTx(tx.id);
                        setEditType(tx.type as "expense" | "income");
                        setEditAmount(String(tx.amount));
                        setEditDescription(tx.description);
                        setEditCategoryId(tx.category_id || "");
                        setEditAccountId(tx.account_id);
                        setEditCardId(tx.credit_card_id || "");
                        setEditNotes(tx.notes || "");
                      }}
                      onDelete={(id) => setDeleteConfirmId(id)}
                    />
                  )
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
      </div>

      {/* Quick expense dialog */}
      <QuickExpenseDialog
        open={showQuickExpense}
        onOpenChange={setShowQuickExpense}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A transação será permanentemente removida do histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const id = deleteConfirmRef.current;
                if (id) {
                  try {
                    const tx = await deleteTransaction(id);
                    if (tx?.credit_card_id && tx.type === "expense") {
                      await updateCardLimit(tx.credit_card_id, tx.amount);
                    }
                    toast("Transação excluída");
                  } catch (err: any) {
                    toast.error("Erro ao excluir", { description: err.message });
                  }
                }
                setDeleteConfirmId(null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit transaction dialog */}
      <Dialog open={editingTx !== null} onOpenChange={(open) => { if (!open) setEditingTx(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar transação</DialogTitle>
            <DialogDescription>Altere os dados da transação</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex rounded-lg border border-border/60 overflow-hidden">
              <button onClick={() => setEditType("expense")} className={`flex-1 py-2 text-xs font-medium transition-colors ${editType === "expense" ? "bg-red-500/10 text-red-600 dark:text-red-400" : "text-muted-foreground hover:text-foreground"}`}>
                <TrendingDown className="h-3.5 w-3.5 inline mr-1" /> Despesa
              </button>
              <button onClick={() => setEditType("income")} className={`flex-1 py-2 text-xs font-medium transition-colors ${editType === "income" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "text-muted-foreground hover:text-foreground"}`}>
                <TrendingUp className="h-3.5 w-3.5 inline mr-1" /> Receita
              </button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
              <Input type="number" step="0.01" min="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="text-base md:text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="text-base md:text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
              <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)} className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm outline-none">
                <option value="">Sem categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Conta</label>
              <select value={editAccountId} onChange={(e) => setEditAccountId(e.target.value)} className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm outline-none">
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Débito via</label>
              <div className="flex rounded-lg border border-border/60 overflow-hidden">
                <button type="button" onClick={() => { setEditAccountId(""); setEditCardId(""); }} className={`flex-1 py-2 text-xs font-medium transition-colors ${!editCardId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <Wallet className="h-3.5 w-3.5 inline mr-1" /> Conta Corrente
                </button>
                <button type="button" onClick={() => { setEditAccountId(""); setEditCardId(""); }} className={`flex-1 py-2 text-xs font-medium transition-colors ${editCardId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  <CreditCard className="h-3.5 w-3.5 inline mr-1" /> Cartão de Crédito
                </button>
              </div>
            </div>
            {!editCardId ? (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Conta</label>
                <select value={editAccountId} onChange={(e) => setEditAccountId(e.target.value)} className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm outline-none">
                  <option value="">Selecione...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cartão</label>
                <select value={editCardId} onChange={(e) => setEditCardId(e.target.value)} className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm outline-none">
                  <option value="">Selecione...</option>
                  {cards.filter((c) => c.status === "active").map((card) => {
                    const parentCard = card.parent_card_id ? cards.find((c) => c.id === card.parent_card_id) : null;
                    const limit = parentCard ? parentCard.available_limit : card.available_limit;
                    const label = card.parent_card_id ? `${card.name} ••••${card.last_digits || ""} (virtual)` : `${card.name} ••••${card.last_digits || ""}`;
                    return (
                      <option key={card.id} value={card.id}>{label} — R$ {limit.toLocaleString("pt-BR")} disponível</option>
                    );
                  })}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="text-base md:text-sm" placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingTx(null)}>Cancelar</Button>
            <Button size="sm" onClick={async () => {
              if (!editingTx || !editAmount || !editDescription) return;
              const finalAccountId = editAccountId || (editCardId ? cards.find((c) => c.id === editCardId)?.account_id ?? "" : "");
              if (!finalAccountId) return;
              try {
                const oldTx = transactions.find((t) => t.id === editingTx);
                await updateTransaction(editingTx, {
                  type: editType,
                  amount: parseFloat(editAmount),
                  description: editDescription,
                  category_id: editCategoryId || null,
                  account_id: finalAccountId,
                  credit_card_id: editCardId || null,
                  notes: editNotes || null,
                });
                // Restaurar limite do cartão antigo
                if (oldTx?.credit_card_id && oldTx.type === "expense") {
                  await updateCardLimit(oldTx.credit_card_id, oldTx.amount);
                }
                // Descontar limite do cartão novo
                if (editCardId && editType === "expense") {
                  await updateCardLimit(editCardId, -parseFloat(editAmount));
                }
                toast("Transação atualizada");
                setEditingTx(null);
              } catch (err: any) {
                toast.error("Erro ao atualizar", { description: err.message });
              }
            }}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
