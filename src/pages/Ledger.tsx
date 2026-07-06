import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useRef } from "react";
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
import { useAuth } from "@/hooks/use-auth";
import { useAccounts } from "@/hooks/use-accounts";
import { useLedger } from "@/hooks/use-ledger";
import { useCreditCards } from "@/hooks/use-cards";
import { useTransactions } from "@/hooks/use-transactions";
import { useInvoices } from "@/hooks/use-invoices";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { useTheme } from "next-themes";
import { Navigate } from "react-router";
import { QuickExpenseDialog } from "@/components/quick-expense-dialog";
import {
  Users,
  Plus,
  LogOut,
  LayoutDashboard,
  List,
  CreditCard,
  Landmark,
  Target,
  Settings,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  DollarSign,
  ArrowRightLeft,
  CreditCard as CardIcon,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  UserPlus,
  Receipt,
  PiggyBank,
  ChevronDown,
  ChevronUp,
  History,
  Cloud,
  CloudRain,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

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


// UI types mapped from Supabase data
interface UIPerson {
  _id: string;
  personName: string;
  personNickname?: string;
  balance: number;
  status: "owes_you" | "you_owe" | "settled";
  statusLabel: string;
  lastActivityDate?: number;
  notes?: string;
}

interface TransactionRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
}

export default function LedgerPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const { accounts: hookAccounts } = useAccounts();
  const { people: ledgerPeople, transactions: ledgerTransactions, loading: ledgerLoading, createPerson, updatePerson, deletePerson, createTransaction } = useLedger();
  const { cards: creditCardsFromSupabase, updateCardLimit } = useCreditCards();
  const { createTransaction: createTxn } = useTransactions();
  const { invoices, createInvoice, updateInvoice } = useInvoices();

  const people: UIPerson[] = useMemo(() =>
    ledgerPeople.map((p) => ({
      _id: p.id,
      personName: p.person_name,
      personNickname: p.person_nickname ?? undefined,
      balance: p.balance,
      status: p.balance > 0 ? "owes_you" as const : p.balance < 0 ? "you_owe" as const : "settled" as const,
      statusLabel: p.balance > 0 ? `Te deve R$ ${p.balance.toFixed(2)}` : p.balance < 0 ? `Você deve R$ ${Math.abs(p.balance).toFixed(2)}` : "Quitado",
      lastActivityDate: p.last_activity_date ? new Date(p.last_activity_date).getTime() : undefined,
      notes: p.notes ?? undefined,
    })),
  [ledgerPeople]);

  const transactions: Record<string, TransactionRecord[]> = useMemo(() => {
    const grouped: Record<string, TransactionRecord[]> = {};
    for (const tx of ledgerTransactions) {
      if (!grouped[tx.person_id]) grouped[tx.person_id] = [];
      grouped[tx.person_id].push({
        id: tx.id,
        date: new Date(tx.date).toLocaleDateString("pt-BR"),
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
      });
    }
    return grouped;
  }, [ledgerTransactions]);

  // Modal states
  const [showNewPerson, setShowNewPerson] = useState(false);
  const [showRecordTxn, setShowRecordTxn] = useState(false);
  const [showSettlePix, setShowSettlePix] = useState(false);
  const [showSettleCard, setShowSettleCard] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<UIPerson | null>(null);
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);
  const [deletePersonId, setDeletePersonId] = useState<string | null>(null);

  // Form states
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonNickname, setNewPersonNickname] = useState("");
  const [newPersonBalance, setNewPersonBalance] = useState("");
  const [editingPerson, setEditingPerson] = useState<UIPerson | null>(null);
  const [editPersonName, setEditPersonName] = useState("");
  const [editPersonNickname, setEditPersonNickname] = useState("");
  const [editPersonBalance, setEditPersonBalance] = useState("");
  const [txnType, setTxnType] = useState<"credit" | "debit">("credit");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDescription, setTxnDescription] = useState("");
  const [txnAccountId, setTxnAccountId] = useState("");
  const [settleAccountId, setSettleAccountId] = useState("");
  const [settleCardId, setSettleCardId] = useState("");
  const [txnCardId, setTxnCardId] = useState("");
  const [showTxnAccountDropdown, setShowTxnAccountDropdown] = useState(false);
  const [showTxnCardDropdown, setShowTxnCardDropdown] = useState(false);
  const [showSettleAccountDropdown, setShowSettleAccountDropdown] = useState(false);
  const [showCardDropdown, setShowCardDropdown] = useState(false);
  const [editTxn, setEditTxn] = useState<{ personId: string; txn: TransactionRecord } | null>(null);
  const [deleteTxn, setDeleteTxn] = useState<{ personId: string; txn: TransactionRecord } | null>(null);
  const [saving, setSaving] = useState(false);
  const txnAccountRef = useRef<HTMLDivElement>(null);
  const txnCardRef = useRef<HTMLDivElement>(null);
  const settleAccountRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (txnAccountRef.current && !txnAccountRef.current.contains(e.target as Node)) setShowTxnAccountDropdown(false);
      if (txnCardRef.current && !txnCardRef.current.contains(e.target as Node)) setShowTxnCardDropdown(false);
      if (settleAccountRef.current && !settleAccountRef.current.contains(e.target as Node)) setShowSettleAccountDropdown(false);
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setShowCardDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);



  const totalReceivable = useMemo(() =>
    people.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0),
  [people]);
  const totalPayable = useMemo(() =>
    people.filter((p) => p.balance < 0).reduce((s, p) => s + Math.abs(p.balance), 0),
  [people]);
  const netBalance = totalReceivable - totalPayable;

  const ledgerAccounts = useMemo(() =>
    hookAccounts.map((a: any) => ({ id: a.id, name: a.name, balance: a.balance })),
  [hookAccounts]);

  const ledgerCards = useMemo(() => {
    if (creditCardsFromSupabase.length === 0) {
      return [{ id: "1", name: "Nenhum cartão", availableLimit: 0, account_id: "" }];
    }
    return creditCardsFromSupabase.map((c) => ({
      id: c.id,
      name: c.name,
      availableLimit: c.available_limit,
      account_id: c.account_id,
    }));
  }, [creditCardsFromSupabase]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || ledgerLoading) {
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

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  }

  function handleNewPerson() {
    if (!newPersonName.trim()) return;
    const initialBalance = parseFloat(newPersonBalance) || 0;
    createPerson({
      person_name: newPersonName.trim(),
      person_nickname: newPersonNickname.trim() || null,
      balance: initialBalance,
      last_activity_date: new Date().toISOString(),
      notes: null,
      sync_status: "synced",
    }).then(() => {
      toast("Pessoa cadastrada", { description: newPersonName });
      setNewPersonName("");
      setNewPersonNickname("");
      setNewPersonBalance("");
      setShowNewPerson(false);
    }).catch(() => {
      toast.error("Erro ao cadastrar pessoa");
    });
  }

  function handleEditPerson() {
    if (!editingPerson || !editPersonName.trim()) return;
    const newBalance = parseFloat(editPersonBalance) ?? editingPerson.balance;
    updatePerson(editingPerson._id, {
      person_name: editPersonName.trim(),
      person_nickname: editPersonNickname.trim() || null,
      balance: newBalance,
    }).then(() => {
      toast("Pessoa atualizada", { description: editPersonName });
      setEditingPerson(null);
    }).catch(() => {
      toast.error("Erro ao atualizar pessoa");
    });
  }

  function handleRecordTxn() {
    if (!selectedPerson || !txnAmount) return;
    if (!txnAccountId && !txnCardId) return;
    if (saving) return;
    const amount = parseFloat(txnAmount);
    setSaving(true);

    createTransaction({
      person_id: selectedPerson._id,
      type: txnType,
      amount,
      description: txnDescription || (txnType === "credit" ? "Crédito" : "Débito"),
      date: new Date().toISOString(),
    }).then(async () => {
      if (txnCardId) {
        const selectedCard = ledgerCards.find((c: any) => c.id === txnCardId);

        await createTxn({
          credit_card_id: txnCardId,
          account_id: txnCardId ? "" : selectedCard?.account_id ?? "",
          category_id: null,
          type: "expense",
          amount,
          description: txnDescription || "Gasto com terceiros",
          date: new Date().toISOString(),
          installment_count: null,
          installment_number: null,
          installment_group_id: null,
          destination_account_id: null,
          settlement_tag: "normal",
          settled_person_id: null,
          notes: null,
          is_recurring: false,
          recurring_id: null,
          client_id: null,
        });

        // Descontar limite do cartão
        await updateCardLimit(txnCardId, -amount);

        const now = new Date();
        const invMonth = now.getMonth() + 1;
        const invYear = now.getFullYear();
        const existingInv = invoices.find(
          (i) => i.credit_card_id === txnCardId && i.month === invMonth && i.year === invYear
        );
        if (existingInv) {
          await updateInvoice(existingInv.id, {
            total_amount: existingInv.total_amount + amount,
            is_paid: false,
          });
        } else {
          const dueDate = new Date(invYear, invMonth + 1, 10);
          const closingDate = new Date(invYear, invMonth + 1, 3);
          await createInvoice({
            credit_card_id: txnCardId,
            month: invMonth,
            year: invYear,
            total_amount: amount,
            paid_amount: 0,
            is_paid: false,
            due_date: dueDate.toISOString(),
            closing_date: closingDate.toISOString(),
            rent_abatement_amount: null,
            sync_status: "synced",
          });
        }

      }

      toast(
        txnType === "credit" ? "Crédito registrado" : "Débito registrado",
        { description: `R$ ${amount.toFixed(2)} — ${selectedPerson.personName}${txnCardId ? " (cartão)" : ""}` },
      );
      setTxnAmount("");
      setTxnDescription("");
      setTxnAccountId("");
      setTxnCardId("");
      setShowRecordTxn(false);
      setSaving(false);
    }).catch(() => {
      toast.error("Erro ao registrar transação");
      setSaving(false);
    });
  }

  function handleSettlePix() {
    if (!selectedPerson || !settleAccountId) return;
    if (saving) return;
    const amount = Math.abs(selectedPerson.balance);
    setSaving(true);

    createTransaction({
      person_id: selectedPerson._id,
      type: selectedPerson.balance > 0 ? "debit" : "credit",
      amount,
      description: "Liquidação via PIX",
      date: new Date().toISOString(),
    }).then(() => {
      toast("Liquidado via PIX", { description: `R$ ${amount.toFixed(2)} — ${selectedPerson.personName}` });
      setSettleAccountId("");
      setShowSettlePix(false);
      setSaving(false);
    }).catch(() => {
      toast.error("Erro ao liquidar via PIX");
      setSaving(false);
    });
  }

  function handleSettleCard() {
    if (!selectedPerson || !settleCardId) return;
    if (saving) return;
    const amount = Math.abs(selectedPerson.balance);
    setSaving(true);

    createTransaction({
      person_id: selectedPerson._id,
      type: selectedPerson.balance > 0 ? "debit" : "credit",
      amount,
      description: "Passado no cartão",
      date: new Date().toISOString(),
    }).then(async () => {
      const selectedCard = ledgerCards.find((c: any) => c.id === settleCardId);

      await createTxn({
        credit_card_id: settleCardId,
        account_id: ledgerCards.find((c: any) => c.id === settleCardId)?.account_id ?? "",
        category_id: null,
        type: "expense",
        amount,
        description: "Acerto com terceiros",
        date: new Date().toISOString(),
        installment_count: null,
        installment_number: null,
        installment_group_id: null,
        destination_account_id: null,
        settlement_tag: "normal",
        settled_person_id: null,
        notes: null,
        is_recurring: false,
        recurring_id: null,
        client_id: null,
      });

      // Descontar limite do cartão
      await updateCardLimit(settleCardId, -amount);

      const now = new Date();
      const invMonth = now.getMonth() + 1;
      const invYear = now.getFullYear();
      const existingInv = invoices.find(
        (i) => i.credit_card_id === settleCardId && i.month === invMonth && i.year === invYear
      );
      if (existingInv) {
        await updateInvoice(existingInv.id, {
          total_amount: existingInv.total_amount + amount,
          is_paid: false,
        });
      } else {
        const dueDate = new Date(invYear, invMonth + 1, 10);
        const closingDate = new Date(invYear, invMonth + 1, 3);
        await createInvoice({
          credit_card_id: settleCardId,
          month: invMonth,
          year: invYear,
          total_amount: amount,
          paid_amount: 0,
          is_paid: false,
          due_date: dueDate.toISOString(),
          closing_date: closingDate.toISOString(),
          rent_abatement_amount: null,
          sync_status: "synced",
        });
      }

      toast("Passado no cartão", {
        description: `R$ ${amount.toFixed(2)} — ${selectedPerson.personName} (${selectedCard?.name ?? "Cartão"})`,
      });
      setSettleCardId("");
      setShowSettleCard(false);
      setSaving(false);
    }).catch(() => {
      toast.error("Erro ao passar no cartão");
      setSaving(false);
    });
  }

  function openAction(person: UIPerson, action: "record" | "pix" | "card") {
    setSelectedPerson(person);
    if (action === "record") {
      setTxnType(person.balance >= 0 ? "debit" : "credit");
      setShowRecordTxn(true);
    } else if (action === "pix") {
      setShowSettlePix(true);
    } else {
      setShowSettleCard(true);
    }
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
                if (item.id === "reports") navigate("/reports");
                if (item.id === "settings") navigate("/settings");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                item.id === "ledger"
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

      <div className="flex-1 flex flex-col md:pt-0 min-h-screen overflow-x-hidden">

      <MobileHeader
        icon={Users}
        title="Terceiros"
        description="Conta-corrente entre você e outras pessoas"
        onPlus={() => setShowNewPerson(true)}
        plusTitle="Nova pessoa"
      />

      <MobileBottomNav currentPath="/ledger" onQuickExpense={() => setShowQuickExpense(true)} />

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-6">
        <div className="w-full px-3 md:px-8 md:max-w-6xl md:mx-auto py-6 md:py-10 overflow-x-hidden">
          {/* Summary cards */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6"
          >
            <div className="p-2 md:p-5 rounded-lg border border-border/60 bg-card">
              <div className="flex items-center justify-between mb-1 md:mb-3">
                <span className="text-[9px] md:text-xs uppercase tracking-wider text-muted-foreground font-medium">A Receber</span>
                <ArrowDownRight className="h-3 w-3 md:h-4 md:w-4 text-green-600/70" />
              </div>
              <span className="text-xs md:text-2xl font-light tracking-tight text-green-700 dark:text-green-400 truncate block" title={`R$ ${formatCurrency(totalReceivable)}`}>
                R$ {totalReceivable >= 1000 ? (totalReceivable / 1000).toFixed(1) + "k" : formatCurrency(totalReceivable)}
              </span>
              <p className="text-[7px] md:text-xs leading-tight text-muted-foreground mt-0.5 md:mt-1 pt-0.5 md:pt-1 border-t border-border/20 md:border-border/30 hidden md:block">
                {people.filter((p) => p.balance > 0).length} pessoa(s) te deve(m)
              </p>
            </div>

            <div className="p-2 md:p-5 rounded-lg border border-border/60 bg-card">
              <div className="flex items-center justify-between mb-1 md:mb-3">
                <span className="text-[9px] md:text-xs uppercase tracking-wider text-muted-foreground font-medium">A Pagar</span>
                <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4 text-red-600/70" />
              </div>
              <span className="text-xs md:text-2xl font-light tracking-tight text-red-700 dark:text-red-400 truncate block" title={`R$ ${formatCurrency(totalPayable)}`}>
                R$ {totalPayable >= 1000 ? (totalPayable / 1000).toFixed(1) + "k" : formatCurrency(totalPayable)}
              </span>
              <p className="text-[7px] md:text-xs leading-tight text-muted-foreground mt-0.5 md:mt-1 pt-0.5 md:pt-1 border-t border-border/20 md:border-border/30 hidden md:block">
                {people.filter((p) => p.balance < 0).length} pessoa(s) te cobra(m)
              </p>
            </div>

            <div className="p-2 md:p-5 rounded-lg border border-border/60 bg-card">
              <div className="flex items-center justify-between mb-1 md:mb-3">
                <span className="text-[9px] md:text-xs uppercase tracking-wider text-muted-foreground font-medium">Saldo</span>
                <ArrowRightLeft className={`h-3 w-3 md:h-4 md:w-4 ${netBalance >= 0 ? "text-green-600/70" : "text-red-600/70"}`} />
              </div>
              <span className={`text-xs md:text-2xl font-light tracking-tight truncate block ${netBalance >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`} title={`R$ ${formatCurrency(netBalance)}`}>
                R$ {netBalance >= 1000 || netBalance <= -1000 ? (netBalance / 1000).toFixed(1) + "k" : formatCurrency(netBalance)}
              </span>
              <p className="text-[7px] md:text-xs leading-tight text-muted-foreground mt-0.5 md:mt-1 pt-0.5 md:pt-1 border-t border-border/20 md:border-border/30 hidden md:block">
                {people.length} pessoa(s)
              </p>
            </div>
          </motion.div>

          {/* People list */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-lg border border-border/60 bg-card"
          >
            {people.length === 0 ? (
              <div className="p-10 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma pessoa cadastrada</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => setShowNewPerson(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar pessoa
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {people.map((person, i) => (
                  <motion.div
                    key={person._id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 * i }}
                    className="p-4 md:p-5 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-start gap-2 md:gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          person.status === "owes_you"
                            ? "bg-green-50 dark:bg-green-950/30"
                            : person.status === "you_owe"
                              ? "bg-red-50 dark:bg-red-950/30"
                              : "bg-secondary"
                        }`}
                      >
                        <Users className={`h-4 w-4 ${
                          person.status === "owes_you"
                            ? "text-green-600 dark:text-green-400"
                            : person.status === "you_owe"
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">
                              {person.personName}
                            </p>
                            {person.personNickname && (
                              <p className="text-xs text-muted-foreground">
                                {person.personNickname}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => { setEditingPerson(person); setEditPersonName(person.personName); setEditPersonNickname(person.personNickname ?? ""); setEditPersonBalance(String(person.balance)); }}
                              className="p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-secondary/50 transition-colors shrink-0"
                              title="Editar pessoa"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={() => setDeletePersonId(person._id)}
                              className="p-1 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shrink-0"
                              title="Excluir pessoa"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className={`text-xs font-medium ${
                            person.status === "owes_you"
                              ? "text-green-600 dark:text-green-400"
                              : person.status === "you_owe"
                                ? "text-red-600 dark:text-red-400"
                                : "text-muted-foreground"
                          }`}>
                            {person.statusLabel}
                          </span>
                          <Badge
                            variant={
                              person.status === "owes_you"
                                ? "secondary"
                                : person.status === "you_owe"
                                  ? "outline"
                                  : "secondary"
                            }
                            className={`text-[10px] ${
                              person.status === "owes_you"
                                ? "border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                                : person.status === "you_owe"
                                  ? "border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
                                  : ""
                            }`}
                          >
                            {person.status === "owes_you"
                              ? "Te deve"
                              : person.status === "you_owe"
                                ? "Você deve"
                                : "Quitado"}
                          </Badge>
                        </div>
                        {person.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {person.notes}
                          </p>
                        )}
                        {person.balance !== 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] px-2"
                              onClick={() => openAction(person, "record")}
                            >
                              <Receipt className="h-3 w-3 mr-1" />
                              Registrar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] px-2"
                              onClick={() => openAction(person, "pix")}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              PIX
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] px-2"
                              onClick={() => openAction(person, "card")}
                            >
                              <CardIcon className="h-3 w-3 mr-1" />
                              Cartão
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Toggle transaction history */}
                    <button
                      onClick={() => setExpandedPersonId(expandedPersonId === person._id ? null : person._id)}
                      className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                      <History className="h-3.5 w-3.5" />
                      {expandedPersonId === person._id ? "Ocultar histórico" : "Ver histórico de transações"}
                      {expandedPersonId === person._id ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
                    </button>

                    {/* Transaction history */}
                    <AnimatePresence>
                      {expandedPersonId === person._id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 pt-2 border-t border-border/20">
                            {transactions[person._id] && transactions[person._id].length > 0 ? (
                              <div className="space-y-1">
                                {transactions[person._id].map((tx) => (
                                  <div
                                    key={tx.id}
                                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-secondary/30 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        tx.type === "credit" ? "bg-green-500" : "bg-red-500"
                                      }`} />
                                      <span className="text-xs text-muted-foreground">{tx.date}</span>
                                      <span className="text-xs text-foreground truncate">{tx.description}</span>
                                    </div>
                                    <span className={`text-xs font-medium tabular-nums shrink-0 ml-2 ${
                                      tx.type === "credit" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                    }`}>
                                      {tx.type === "credit" ? "+" : "−"}R$ {tx.amount.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma transação registrada</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </main>
      </div>

      {/* Quick expense dialog */}
      <QuickExpenseDialog open={showQuickExpense} onOpenChange={setShowQuickExpense} />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deletePersonId !== null} onOpenChange={(open) => { if (!open) setDeletePersonId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pessoa?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as transações associadas serão removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletePersonId) {
                  deletePerson(deletePersonId).catch(() => {
                    toast.error("Erro ao excluir pessoa");
                  });
                }
                setDeletePersonId(null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: New Person */}
      <Dialog open={showNewPerson} onOpenChange={(open) => { if (!open) { setNewPersonName(""); setNewPersonNickname(""); } setShowNewPerson(open); }}>
        <DialogContent className="sm:max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova pessoa</DialogTitle>
            <DialogDescription>
              Cadastre uma pessoa para controlar a conta-corrente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Nome completo
              </label>
              <Input
                placeholder="Ex: João Silva"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Apelido (opcional)
              </label>
              <Input
                placeholder="Ex: Joãozinho"
                value={newPersonNickname}
                onChange={(e) => setNewPersonNickname(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Saldo inicial (R$) — opcional
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={newPersonBalance}
                onChange={(e) => setNewPersonBalance(e.target.value)}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Positivo = pessoa te deve. Negativo = você deve.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowNewPerson(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleNewPerson} disabled={!newPersonName.trim()}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Person */}
      <Dialog open={editingPerson != null} onOpenChange={(open) => { if (!open) setEditingPerson(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar pessoa</DialogTitle>
            <DialogDescription>
              Altere os dados de {editingPerson?.personName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Nome completo</label>
              <Input placeholder="Ex: João Silva" value={editPersonName} onChange={(e) => setEditPersonName(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Apelido (opcional)</label>
              <Input placeholder="Ex: Joãozinho" value={editPersonNickname} onChange={(e) => setEditPersonNickname(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Saldo (R$)</label>
              <Input type="number" step="0.01" value={editPersonBalance} onChange={(e) => setEditPersonBalance(e.target.value)} className="text-sm" />
              <p className="text-[10px] text-muted-foreground mt-0.5">Positivo = pessoa te deve. Negativo = você deve.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingPerson(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleEditPerson} disabled={!editPersonName.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Record Transaction */}
      <Dialog open={showRecordTxn} onOpenChange={setShowRecordTxn}>
        <DialogContent className="sm:max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar transação</DialogTitle>
            <DialogDescription>
              {selectedPerson?.personName} — saldo atual:{" "}
              <span className={selectedPerson && selectedPerson.balance >= 0 ? "text-green-600" : "text-red-600"}>
                {selectedPerson && (selectedPerson.balance >= 0 ? "+" : "")}
                R$ {selectedPerson ? Math.abs(selectedPerson.balance).toFixed(2) : "0,00"}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Tipo</label>
              <div className="flex rounded-lg border border-border/60 overflow-hidden">
                <button
                  onClick={() => setTxnType("credit")}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    txnType === "credit"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ArrowUpRight className="h-3.5 w-3.5 inline mr-1" />
                  Crédito
                </button>
                <button
                  onClick={() => setTxnType("debit")}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    txnType === "debit"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ArrowDownRight className="h-3.5 w-3.5 inline mr-1" />
                  Débito
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {txnType === "credit" ? "Você pagou por eles — eles passam a te dever" : "Eles pagaram por você — você passa a dever a eles"}
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Valor (R$)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={txnAmount}
                onChange={(e) => setTxnAmount(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Descrição</label>
              <Input
                placeholder="Ex: Jantar no restaurante"
                value={txnDescription}
                onChange={(e) => setTxnDescription(e.target.value)}
                className="text-sm"
              />
            </div>
            <div ref={txnAccountRef} className="relative">
              <label className="text-xs text-muted-foreground mb-1.5 block">Conta</label>
              <button
                type="button"
                onClick={() => setShowTxnAccountDropdown(!showTxnAccountDropdown)}
                className="border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] h-9"
              >
                <span className={txnAccountId ? "" : "text-muted-foreground"}>
                  {txnAccountId ? ledgerAccounts.find((a: any) => a.id === txnAccountId)?.name : "Selecione uma conta"}
                </span>
                <svg className="size-4 opacity-50 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showTxnAccountDropdown && (
                <div className="bg-popover text-popover-foreground absolute z-50 w-full min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-hidden rounded-md border shadow-md mt-1">
                  {ledgerAccounts.map((acc: any) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => { setTxnAccountId(acc.id); setShowTxnAccountDropdown(false); }}
                      className={`focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center justify-between gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none ${
                        txnAccountId === acc.id ? "bg-accent text-accent-foreground" : ""
                      }`}
                    >
                      <span>{acc.name}</span>
                      <span className="tabular-nums text-muted-foreground">R$ {formatCurrency(acc.balance)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div ref={txnCardRef} className="relative">
              <label className="text-xs text-muted-foreground mb-1.5 block">Cartão de Crédito</label>
              <button
                type="button"
                onClick={() => setShowTxnCardDropdown(!showTxnCardDropdown)}
                className="border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] h-9"
              >
                <span className={txnCardId ? "" : "text-muted-foreground"}>
                  {txnCardId ? ledgerCards.find((c: any) => c.id === txnCardId)?.name : "Nenhum"}
                </span>
                <svg className="size-4 opacity-50 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {showTxnCardDropdown && (
                <div className="bg-popover text-popover-foreground absolute z-50 w-full min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-hidden rounded-md border shadow-md mt-1">
                  <button
                    type="button"
                    onClick={() => { setTxnCardId(""); setShowTxnCardDropdown(false); }}
                    className={`focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none ${
                      !txnCardId ? "bg-accent text-accent-foreground" : ""
                    }`}
                  >
                    Nenhum (conta corrente)
                  </button>
                  {ledgerCards.map((card: any) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => { setTxnCardId(card.id); setShowTxnCardDropdown(false); }}
                      className={`focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center justify-between gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none ${
                        txnCardId === card.id ? "bg-accent text-accent-foreground" : ""
                      }`}
                    >
                      <span>{card.name}</span>
                      <span className="tabular-nums text-muted-foreground">R$ {formatCurrency(card.availableLimit)} disp.</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowRecordTxn(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleRecordTxn}
            >
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              {txnType === "credit" ? "Registrar crédito" : "Registrar débito"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Settle via PIX */}
      <Dialog open={showSettlePix} onOpenChange={setShowSettlePix}>
        <DialogContent className="sm:max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Liquidar via PIX</DialogTitle>
            <DialogDescription>
              {selectedPerson?.personName} —{" "}
              {selectedPerson && selectedPerson.balance > 0
                ? "receber pagamento"
                : "pagar dívida"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 rounded-lg bg-secondary/30 mb-4">
              <p className="text-xs text-muted-foreground">Valor da liquidação</p>
              <p className="text-lg font-light tracking-tight">
                R$ {selectedPerson ? Math.abs(selectedPerson.balance).toFixed(2) : "0,00"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedPerson && selectedPerson.balance > 0
                  ? `${selectedPerson.personName} paga você via PIX`
                  : `Você paga ${selectedPerson?.personName} via PIX`}
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Conta para {selectedPerson && selectedPerson.balance > 0 ? "receber" : "pagar"}
              </label>
              <div ref={settleAccountRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowSettleAccountDropdown(!showSettleAccountDropdown)}
                  className="border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] h-9"
                >
                  <span className={settleAccountId ? "" : "text-muted-foreground"}>
                    {settleAccountId ? ledgerAccounts.find((a: any) => a.id === settleAccountId)?.name : "Selecione uma conta"}
                  </span>
                  <svg className="size-4 opacity-50 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showSettleAccountDropdown && (
                  <div className="bg-popover text-popover-foreground absolute z-50 w-full min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-hidden rounded-md border shadow-md mt-1">
                    {ledgerAccounts.map((acc: any) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => { setSettleAccountId(acc.id); setShowSettleAccountDropdown(false); }}
                        className={`focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center justify-between gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none ${
                          settleAccountId === acc.id ? "bg-accent text-accent-foreground" : ""
                        }`}
                      >
                        <span>{acc.name}</span>
                        <span className="tabular-nums text-muted-foreground">R$ {formatCurrency(acc.balance)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSettlePix(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSettlePix}
              disabled={!settleAccountId}
            >
              <DollarSign className="h-3.5 w-3.5 mr-1.5" />
              {selectedPerson && selectedPerson.balance > 0
                ? "Confirmar recebimento"
                : "Pagar via PIX"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Settle via Card */}
      <Dialog open={showSettleCard} onOpenChange={setShowSettleCard}>
        <DialogContent className="sm:max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Passar no cartão</DialogTitle>
            <DialogDescription>
              {selectedPerson?.personName} — transferir passivo para o cartão de crédito
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 rounded-lg bg-secondary/30 mb-4">
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-lg font-light tracking-tight">
                R$ {selectedPerson ? Math.abs(selectedPerson.balance).toFixed(2) : "0,00"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedPerson && selectedPerson.balance > 0
                  ? `${selectedPerson.personName} pediu para passar no cartão. Ele te paga em dinheiro/PIX e a dívida é quitada.`
                  : `Você passa no cartão para pagar ${selectedPerson?.personName}. O saldo é zerado e vira fatura.`}
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Cartão</label>
              <div ref={cardRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowCardDropdown(!showCardDropdown)}
                  className="border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] h-9"
                >
                  <span className={settleCardId ? "" : "text-muted-foreground"}>
                    {settleCardId ? ledgerCards.find((c: any) => c.id === settleCardId)?.name : "Selecione um cartão"}
                  </span>
                  <svg className="size-4 opacity-50 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showCardDropdown && (
                  <div className="bg-popover text-popover-foreground absolute z-50 w-full min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-hidden rounded-md border shadow-md mt-1">
                    {ledgerCards.map((card: any) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => { setSettleCardId(card.id); setShowCardDropdown(false); }}
                        className={`focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center justify-between gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none ${
                          settleCardId === card.id ? "bg-accent text-accent-foreground" : ""
                        }`}
                      >
                        <span>{card.name}</span>
                        <span className="tabular-nums text-muted-foreground">R$ {formatCurrency(card.availableLimit)} disp.</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSettleCard(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSettleCard}
              disabled={!settleCardId}
            >
              <CardIcon className="h-3.5 w-3.5 mr-1.5" />
              Passar no cartão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
