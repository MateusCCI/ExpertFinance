import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  AlertDialogContent as ADContent,
  AlertDialogDescription as ADDescription,
  AlertDialogFooter as ADFooter,
  AlertDialogHeader as ADHeader,
  AlertDialogTitle as ADTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { useTheme } from "next-themes";
import { Navigate } from "react-router";
import { toast } from "sonner";
import { QuickExpenseDialog } from "@/components/quick-expense-dialog";
import { useCreditCards, CreditCard as CreditCardRow } from "@/hooks/use-cards";
import { useInvoices } from "@/hooks/use-invoices";
import { useTransactions } from "@/hooks/use-transactions";
import { useAccounts } from "@/hooks/use-accounts";
import {
  CreditCard,
  Plus,
  TrendingUp,
  Wallet,
  LogOut,
  RefreshCw,
  LayoutDashboard,
  List,
  Landmark,
  Target,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  Moon,
  Sun,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PiggyBank,
  Gauge,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Pencil,
  Trash2,
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
] as const;

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function formatInvoiceMonth(month: number, year: number) {
  return `${MONTH_NAMES[month - 1]}/${year}`;
}

function formatDueShort(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ===== EDIT DIALOG =====

function NewCardForm({
  onSave,
  onCancel,
  editingCard,
  physicalCards,
}: {
  onSave: (data: {
    name: string;
    brand: string;
    lastDigits: string;
    totalLimit: number;
    closingDay: number;
    dueDay: number;
    annualFee: number;
    cashbackRate: number;
    status: string;
    color: string;
    spendTargetForWaiver: number;
    virtuals: Array<{ name: string; lastDigits: string }>;
  }) => void;
  onCancel: () => void;
  editingCard?: CreditCardRow | null;
  physicalCards: CreditCardRow[];
}) {
  const [brand, setBrand] = useState(editingCard?.brand ?? "Visa");
  const [cardName, setCardName] = useState(editingCard?.name ?? "");
  const [lastDigits, setLastDigits] = useState(editingCard?.last_digits ?? "");
  const [totalLimit, setTotalLimit] = useState(editingCard ? String(editingCard.total_limit) : "");
  const [closingDay, setClosingDay] = useState(editingCard ? String(editingCard.closing_day) : "");
  const [dueDay, setDueDay] = useState(editingCard ? String(editingCard.due_day) : "");
  const [annualFee, setAnnualFee] = useState(editingCard ? String(editingCard.annual_fee ?? 0) : "0");
  const [cashbackRate, setCashbackRate] = useState(editingCard ? String((editingCard.cashback_rate ?? 0) * 100) : "0");
  const [status, setStatus] = useState(editingCard?.status ?? "active");
  const [spendTarget, setSpendTarget] = useState(editingCard ? String(editingCard.spend_target_for_waiver ?? 0) : '0');
  const [cardColor, setCardColor] = useState(editingCard?.color ?? "#3b82f6");
  const [virtuals, setVirtuals] = useState<Array<{ name: string; lastDigits: string }>>([]);

  const handleSave = () => {
    const limit = Number(totalLimit) || 0;
    onSave({
      name: cardName.trim() || brand,
      brand,
      lastDigits: lastDigits.padEnd(4, "0"),
      totalLimit: limit,
      closingDay: Number(closingDay) || 1,
      dueDay: Number(dueDay) || 1,
      annualFee: Number(annualFee) || 0,
      cashbackRate: (Number(cashbackRate) || 0) / 100,
      status,
      color: cardColor,
      spendTargetForWaiver: Number(spendTarget) || 0,
      virtuals: virtuals.filter((v) => v.lastDigits.trim()),
    });
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="new-name">Nome do cartão</Label>
        <Input id="new-name" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Ex: Nubank Ultravioleta" />
      </div>
      <div className="space-y-1.5">
        <Label>Cor do cartão</Label>
        <div className="flex gap-2 flex-wrap">
          {["#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#f59e0b", "#22c55e", "#14b8a6", "#06b6d4", "#6366f1", "#1e293b", "#000000"].map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setCardColor(color)}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                cardColor === color ? "border-foreground scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-brand">Bandeira</Label>
        <select
          id="new-brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm outline-none"
        >
          <option value="Visa">Visa</option>
          <option value="Mastercard">Mastercard</option>
          <option value="Elo">Elo</option>
          <option value="Amex">Amex</option>
          <option value="Hipercard">Hipercard</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-digits">Últimos 4 dígitos</Label>
          <Input id="new-digits" value={lastDigits} onChange={(e) => setLastDigits(e.target.value)} maxLength={4} placeholder="0000" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-limit">Limite total (R$)</Label>
          <Input id="new-limit" type="number" value={totalLimit} onChange={(e) => setTotalLimit(e.target.value)} placeholder="5000" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-closing">Dia fechamento</Label>
          <Input id="new-closing" type="number" min="1" max="28" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} placeholder="15" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-due">Dia vencimento</Label>
          <Input id="new-due" type="number" min="1" max="28" value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="22" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-fee">Anuidade (R$/ano)</Label>
          <Input id="new-fee" type="number" value={annualFee} onChange={(e) => setAnnualFee(e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-cashback">Cashback (%)</Label>
          <Input id="new-cashback" type="number" step="0.1" min="0" max="100" value={cashbackRate} onChange={(e) => setCashbackRate(e.target.value)} placeholder="1" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-spend-target">Meta de gasto para isenção (R$/ano)</Label>
        <Input id="new-spend-target" type="number" value={spendTarget} onChange={(e) => setSpendTarget(e.target.value)} placeholder="0" />
      </div>

      {/* Cartoes virtuais */}
      <div className="border-t border-border/40 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Cartoes virtuais</Label>
          <button
            type="button"
            onClick={() => setVirtuals([...virtuals, { name: "", lastDigits: "" }])}
            className="text-xs text-primary hover:underline"
          >
            + Adicionar
          </button>
        </div>
        {virtuals.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum cartao virtual. Clique em "+ Adicionar" para vincular.</p>
        )}
        {virtuals.map((v, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Input
                value={v.name}
                onChange={(e) => {
                  const next = [...virtuals];
                  next[i] = { ...next[i], name: e.target.value };
                  setVirtuals(next);
                }}
                placeholder="Nome (ex: Apple Pay)"
                className="h-8 text-xs"
              />
            </div>
            <div className="w-20 space-y-1">
              <Input
                value={v.lastDigits}
                onChange={(e) => {
                  const next = [...virtuals];
                  next[i] = { ...next[i], lastDigits: e.target.value };
                  setVirtuals(next);
                }}
                maxLength={4}
                placeholder="0000"
                className="h-8 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => setVirtuals(virtuals.filter((_, j) => j !== i))}
              className="p-1.5 text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      {editingCard && (
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Cartão {status === "active" ? "ativo" : "bloqueado"}</p>
            <p className="text-xs text-muted-foreground">{status === "active" ? "Funcionando normalmente" : "Compras não autorizadas"}</p>
          </div>
          <Button
            variant={status === "active" ? "destructive" : "default"}
            size="sm"
            onClick={() => setStatus(status === "active" ? "blocked" : "active")}
          >
            {status === "active" ? "Bloquear" : "Ativar"}
          </Button>
        </div>
      )}
      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={!lastDigits.trim()}>{editingCard ? "Salvar" : "Adicionar"}</Button>
      </DialogFooter>
    </div>
  );
}

// ===== PURCHASE FORM =====

function NewPurchaseForm({
  physicalCards,
  createTransaction,
  updateCardLimit,
  createInvoice,
  updateInvoice,
  allInvoices,
  accounts,
}: {
  physicalCards: CreditCardRow[];
  createTransaction: (tx: any) => Promise<any>;
  updateCardLimit: (id: string, limit: number) => Promise<void>;
  createInvoice: (inv: any) => Promise<any>;
  updateInvoice: (id: string, patch: any) => Promise<void>;
  allInvoices: any[];
  accounts: any[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [cardId, setCardId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [installments, setInstallments] = useState("1");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!amount || !description || !cardId) return;
    setSaving(true);
    try {
      const numAmount = parseFloat(amount);
      const numInstallments = parseInt(installments) || 1;
      const selectedCard = physicalCards.find((c) => c.id === cardId);
      const accountId = accounts[0]?.id ?? "";

      await createTransaction({
        account_id: accountId,
        credit_card_id: cardId,
        type: "expense" as const,
        amount: numAmount,
        description,
        category_id: null,
        date: new Date().toISOString(),
        installment_count: numInstallments > 1 ? numInstallments : null,
        installment_number: null,
        installment_group_id: numInstallments > 1 ? crypto.randomUUID() : null,
        destination_account_id: null,
        settlement_tag: "credit",
        settled_person_id: null,
        notes: null,
        is_recurring: false,
        recurring_id: null,
        client_id: null,
      });

      // Atualizar limite do cartão
      if (cardId) {
        await updateCardLimit(cardId, -numAmount);
      }

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const currentInstallmentAmount = numInstallments > 1 ? numAmount / numInstallments : numAmount;

      const existingInv = allInvoices.find(
        (i: any) => i.credit_card_id === cardId && i.month === currentMonth && i.year === currentYear
      );

      if (existingInv) {
        await updateInvoice(existingInv.id, {
          total_amount: existingInv.total_amount + currentInstallmentAmount,
          is_paid: false,
        });
      } else {
        const dueDate = new Date(currentYear, currentMonth, selectedCard?.due_day ?? 10);
        const closingDate = new Date(currentYear, currentMonth - 1, selectedCard?.closing_day ?? 3);
        await createInvoice({
          credit_card_id: cardId,
          month: currentMonth,
          year: currentYear,
          total_amount: currentInstallmentAmount,
          paid_amount: 0,
          is_paid: false,
          due_date: dueDate.toISOString(),
          closing_date: closingDate.toISOString(),
          rent_abatement_amount: null,
        });
      }

      toast("Compra registrada", {
        description: `R$ ${numAmount.toFixed(2)} — ${description}${numInstallments > 1 ? ` (${numInstallments}x R$ ${(numAmount / numInstallments).toFixed(2)})` : ""}`,
      });
      setAmount("");
      setDescription("");
      setCategory("");
      setCardId("");
      setInstallments("1");
      setShowForm(false);
    } catch (err) {
      toast.error("Erro ao registrar compra");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Compras registradas</h3>
        <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" />
          {showForm ? "Cancelar" : "Nova compra"}
        </Button>
      </div>

      {showForm && (
        <div className="p-4 rounded-lg border border-border/60 bg-card mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cartão</Label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {physicalCards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" step="0.01" min="0.01" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input placeholder="Ex: Supermercado" value={description} onChange={(e) => setDescription(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {["Alimentação","Moradia","Transporte","Saúde","Lazer","Compras","Educação","Serviços","Outros"].map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Parcelas</Label>
            <Select value={installments} onValueChange={setInstallments}>
              <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {i === 0 ? "À vista" : `${i + 1}x`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleSave} disabled={!amount || !description || !cardId || saving} className="w-full">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {saving ? "Salvando..." : "Registrar compra"}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground text-center py-4">
          As compras são registradas como transações e aparecem na aba Transações.
        </p>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====

export default function CreditCardsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, setTheme } = useTheme();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [showNewCard, setShowNewCard] = useState(false);

  const {
    cards: rawCards,
    loading: cardsLoading,
    createCard,
    updateCard,
    deleteCard,
    updateCardLimit,
  } = useCreditCards();

  const { invoices: allInvoices, loading: invoicesLoading, createInvoice, updateInvoice } = useInvoices();
  const { createTransaction, transactions: allTransactions } = useTransactions();
  const { accounts } = useAccounts();

  const loading = cardsLoading || invoicesLoading;

  const physicalCards = useMemo(
    () => rawCards.filter((c) => !c.parent_card_id),
    [rawCards]
  );

  // IDs de transações que pertencem ao cartão físico (incluindo virtuais filhos)
  const getCardTransactionIds = useMemo(() => {
    const virtualByParent = new Map<string, string[]>();
    rawCards.forEach((c) => {
      if (c.parent_card_id) {
        const list = virtualByParent.get(c.parent_card_id) || [];
        list.push(c.id);
        virtualByParent.set(c.parent_card_id, list);
      }
    });
    return (physicalCardId: string) => {
      const virtualIds = virtualByParent.get(physicalCardId) || [];
      return [physicalCardId, ...virtualIds];
    };
  }, [rawCards]);

  // Mapa card_id → last_digits para mostrar dígitos do virtual
  const cardDigitsMap = useMemo(() => {
    const map = new Map<string, string>();
    rawCards.forEach((c) => map.set(c.id, c.last_digits || "••••"));
    return map;
  }, [rawCards]);

  // Virtuais agrupados por pai
  const virtualsByParent = useMemo(() => {
    const map = new Map<string, { id: string; name: string; last_digits: string }[]>();
    rawCards.forEach((c) => {
      if (c.parent_card_id) {
        const list = map.get(c.parent_card_id) || [];
        list.push({ id: c.id, name: c.name, last_digits: c.last_digits || "••••" });
        map.set(c.parent_card_id, list);
      }
    });
    return map;
  }, [rawCards]);

  const activeCardIds = useMemo(() => new Set(physicalCards.map((c) => c.id)), [physicalCards]);
  const activeCardNames = new Set(physicalCards.map((c) => c.name));

  const visibleInvoices = useMemo(
    () => allInvoices.filter((inv) => activeCardIds.has(inv.credit_card_id)),
    [allInvoices, activeCardIds]
  );

  const alerts = useMemo(() => {
    const result: { cardName: string; type: string; message: string; severity: "warning" | "danger" | "info" }[] = [];
    physicalCards.forEach((card) => {
      const limitUsed = card.total_limit - card.available_limit;
      const limitPercent = card.total_limit > 0 ? (limitUsed / card.total_limit) * 100 : 0;
      if (limitPercent > 85) {
        result.push({
          cardName: card.name,
          type: "limit",
          message: `Limite em alerta: ${Math.round(limitPercent)}% utilizado`,
          severity: "danger",
        });
      } else if (limitPercent > 70) {
        result.push({
          cardName: card.name,
          type: "limit",
          message: `Limite em alerta: ${Math.round(limitPercent)}% utilizado`,
          severity: "warning",
        });
      }
      if (card.annual_fee && card.annual_fee > 0 && card.spend_target_for_waiver) {
        const target = card.spend_target_for_waiver;
        const spent = limitUsed;
        const remaining = target - spent;
        if (remaining > 0) {
          result.push({
            cardName: card.name,
            type: "waiver",
            message: `Faltam R$ ${formatCurrency(remaining)} em gastos para isentar anuidade`,
            severity: "info",
          });
        }
      }
    });
    return result;
  }, [physicalCards]);

  const suggestion = useMemo(() => {
    if (physicalCards.length === 0) return null;
    let bestCard = physicalCards[0];
    let bestPct = 0;
    physicalCards.forEach((card) => {
      if (card.total_limit > 0) {
        const pct = (card.available_limit / card.total_limit) * 100;
        if (pct > bestPct) {
          bestPct = pct;
          bestCard = card;
        }
      }
    });
    if (bestPct > 0) {
      return {
        cardName: bestCard.name,
        reason: `Limite disponível: ${Math.round(bestPct)}% — ideal para girar`,
        priority: 2,
      };
    }
    return null;
  }, [physicalCards]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || loading) {
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

  const totalLimit = physicalCards.reduce((s, c) => s + c.total_limit, 0);
  const totalAvailable = physicalCards.reduce((s, c) => s + c.available_limit, 0);
  const totalCashback = physicalCards.reduce((s, c) => s + c.cashback_balance, 0);
  const editingCard = editingCardId ? rawCards.find((c) => c.id === editingCardId) ?? null : null;

  const handleSaveCard = async (data: {
    name: string;
    brand: string;
    lastDigits: string;
    totalLimit: number;
    closingDay: number;
    dueDay: number;
    annualFee: number;
    cashbackRate: number;
    status: string;
    color: string;
    spendTargetForWaiver: number;
    virtuals: Array<{ name: string; lastDigits: string }>;
  }) => {
    try {
      const accountId = accounts[0]?.id ?? "";
      if (!accountId) {
        toast.error("Nenhuma conta encontrada. Crie uma conta primeiro.");
        return;
      }

      if (editingCardId) {
        const currentCard = rawCards.find((c) => c.id === editingCardId);
        await updateCard(editingCardId, {
          name: data.name,
          brand: data.brand,
          last_digits: data.lastDigits,
          total_limit: data.totalLimit,
          available_limit: currentCard?.available_limit ?? data.totalLimit,
          closing_day: data.closingDay,
          due_day: data.dueDay,
          annual_fee: data.annualFee,
          spend_target_for_waiver: data.spendTargetForWaiver || null,
          cashback_rate: data.cashbackRate,
          status: data.status as "active" | "blocked" | "cancelled",
          color: data.color,
        });

        toast("Cartão atualizado", { description: data.name });
        setEditingCardId(null);
      } else {
        const newCard = await createCard({
          account_id: accountId,
          name: data.name,
          brand: data.brand,
          last_digits: data.lastDigits,
          total_limit: data.totalLimit,
          available_limit: data.totalLimit,
          closing_day: data.closingDay,
          due_day: data.dueDay,
          annual_fee: data.annualFee,
          spend_target_for_waiver: data.spendTargetForWaiver || null,
          cashback_rate: data.cashbackRate,
          cashback_balance: 0,
          parent_card_id: null,
          status: "active",
          color: data.color,
        });

        // Criar cartoes virtuais vinculados
        for (const v of data.virtuals) {
          await createCard({
            account_id: accountId,
            name: v.name || `${data.name} (virtual)`,
            brand: data.brand,
            last_digits: v.lastDigits.padEnd(4, "0"),
            total_limit: 0,
            available_limit: 0,
            closing_day: data.closingDay,
            due_day: data.dueDay,
            annual_fee: 0,
            spend_target_for_waiver: null,
            cashback_rate: 0,
            cashback_balance: 0,
            parent_card_id: newCard.id,
            status: "active",
            color: data.color,
          });
        }

        toast("Cartao adicionado", { description: data.name + (data.virtuals.length > 0 ? ` + ${data.virtuals.length} virtual(is)` : "") });
      }
      setShowNewCard(false);
    } catch (err) {
      toast.error("Erro ao salvar cartão");
      console.error(err);
    }
  };

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
                item.id === "cards"
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

      {/* Mobile layout */}
      <div className="flex-1 flex flex-col md:pt-0 min-h-screen">
        <MobileHeader
          icon={CreditCard}
          title="Cartões"
          description="Cartões de crédito e faturas"
          onRefresh={() => {}}
          onPlus={() => setShowNewCard(true)}
          plusTitle="Novo cartão"
        />

        <MobileBottomNav currentPath="/cards" onQuickExpense={() => setShowQuickExpense(true)} />

        <main className="flex-1 overflow-auto pb-20 md:pb-6">
          <div className="w-full px-3 md:px-8 md:max-w-6xl md:mx-auto py-4 md:py-10">
            {/* Summary cards */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6"
            >
              <div className="p-3 md:p-5 rounded-lg border border-border/60 bg-card">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <span className="text-[10px] md:text-xs text-muted-foreground">Limite Total</span>
                  <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </div>
                <span className="text-sm md:text-2xl font-light tracking-tight">
                  R$ {formatCurrency(totalLimit)}
                </span>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
                  R$ {formatCurrency(totalAvailable)} disp.
                </p>
              </div>

              <div className="p-3 md:p-5 rounded-lg border border-border/60 bg-card">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <span className="text-[10px] md:text-xs text-muted-foreground">Cashback</span>
                  <PiggyBank className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </div>
                <span className="text-sm md:text-2xl font-light tracking-tight">
                  R$ {formatCurrency(totalCashback)}
                </span>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
                  Acumulado
                </p>
              </div>

              <div className="p-3 md:p-5 rounded-lg border border-border/60 bg-card">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <span className="text-[10px] md:text-xs text-muted-foreground">Ativos</span>
                  <Gauge className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                </div>
                <span className="text-sm md:text-2xl font-light tracking-tight">
                  {physicalCards.length}
                </span>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
                  cartão(is) ativo(s)
                </p>
              </div>
            </motion.div>

            {/* Suggestion + Alerts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="p-3 md:p-4 rounded-lg border border-border/60 bg-card"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-foreground/70" />
                  <h3 className="text-xs font-medium text-foreground">Sugestão do Dia</h3>
                </div>
                {suggestion ? (
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium tracking-tight truncate">{suggestion.cardName}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{suggestion.reason}</p>
                    </div>
                    <Badge variant="secondary" className="text-[9px] shrink-0 ml-2">P{suggestion.priority}</Badge>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhuma sugestão</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/30">
                  Isenção &gt; girar limite &gt; cashback
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="p-3 md:p-4 rounded-lg border border-border/60 bg-card"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-foreground/70" />
                  <h3 className="text-xs font-medium text-foreground">Alertas</h3>
                </div>
                <div className="space-y-1.5">
                  {alerts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum alerta</p>
                  ) : (
                    alerts.slice(0, 3).map((alert, i) => (
                      <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border/20 last:border-0">
                        {alert.severity === "danger" ? (
                          <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                        ) : alert.severity === "warning" ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-foreground truncate">{alert.cardName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{alert.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>

            {/* Card list */}
            <Tabs defaultValue="overview">
              <TabsList className="mb-4 md:mb-6">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid gap-4">
                  {physicalCards.map((card, i) => {
                    const limitUsed = card.total_limit - card.available_limit;
                    const limitPercent = card.total_limit > 0 ? (limitUsed / card.total_limit) * 100 : 0;
                    const isExpanded = expandedCard === card.id;

                    return (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 * i }}
                        className="rounded-lg border border-border/60 bg-card overflow-hidden"
                      >
                        <div className="h-1.5 w-full" style={{ backgroundColor: card.color || "#3b82f6" }} />
                        <div className="p-4 md:p-5">
                          <div className="flex items-start justify-between mb-3 md:mb-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-foreground">{card.name}</h3>
                                <Badge variant="secondary" className="text-[10px]">{card.brand}</Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-xs text-muted-foreground tabular-nums font-mono tracking-wider">
                                  •••• {card.last_digits}
                                </span>
                                {(virtualsByParent.get(card.id) || []).map((v) => (
                                  <span key={v.id} className="text-[10px] text-muted-foreground/60 tabular-nums font-mono tracking-wider">
                                    | ••••{v.last_digits}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditingCardId(card.id)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                                title="Editar cartão"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingCardId(card.id)}
                                className="p-1.5 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                title="Excluir cartão"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <Badge variant={card.status === "active" ? "secondary" : "outline"} className="text-[10px]">
                                {card.status === "active" ? "Ativo" : card.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="text-muted-foreground">Limite</span>
                              <span className="text-foreground tabular-nums">
                                R$ {formatCurrency(limitUsed)} / R$ {formatCurrency(card.total_limit)}
                              </span>
                            </div>
                            <Progress
                              value={limitPercent}
                              className={`h-2 ${
                                limitPercent > 85
                                  ? "bg-red-100 dark:bg-red-950/30"
                                  : limitPercent > 70
                                    ? "bg-amber-100 dark:bg-amber-950/30"
                                    : ""
                              }`}
                            />
                            <div className="flex items-center justify-between text-xs mt-1.5">
                              <span className="text-muted-foreground">Fechamento: dia {card.closing_day}</span>
                              <span className="text-muted-foreground">Vencimento: dia {card.due_day}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-3 border-t border-border/30">
                            {card.cashback_rate != null && card.cashback_rate > 0 && (
                              <div className="flex items-center gap-1.5">
                                <PiggyBank className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {(card.cashback_rate * 100).toFixed(1)}% • R$ {formatCurrency(card.cashback_balance)}
                                </span>
                              </div>
                            )}
                            {card.annual_fee != null && card.annual_fee > 0 && card.spend_target_for_waiver ? (
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  Meta: {Math.min(100, Math.round((limitUsed / card.spend_target_for_waiver) * 100))}%
                                </span>
                              </div>
                            ) : card.annual_fee === 0 || card.annual_fee == null ? (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                <span className="text-xs text-green-600 dark:text-green-400">Sem anuidade</span>
                              </div>
                            ) : null}
                          </div>

                          <button
                            onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                            className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                          >
                            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            {isExpanded ? "Ocultar compras" : `Ver compras`}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-border/40 bg-muted/20">
                            {allTransactions.filter((t) => t.credit_card_id && getCardTransactionIds(card.id).includes(t.credit_card_id)).length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma compra registrada</p>
                            ) : (
                              allTransactions.filter((t) => t.credit_card_id && getCardTransactionIds(card.id).includes(t.credit_card_id)).slice(0, 10).map((tx) => (
                                <div key={tx.id} className="px-4 md:px-5 py-3 border-b border-border/30 last:border-0 flex items-center justify-between">
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate">{tx.description}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {new Date(tx.date).toLocaleDateString("pt-BR")}
                                      {tx.credit_card_id !== card.id && ` • •••${cardDigitsMap.get(tx.credit_card_id || "") || ""}`}
                                    </p>
                                  </div>
                                  <span className={`text-xs font-medium tabular-nums shrink-0 ml-3 ${tx.type === "expense" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                                    {tx.type === "expense" ? "-" : "+"}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="history">
                <div className="space-y-4">
                  {physicalCards.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum cartão cadastrado</p>
                  ) : (
                    physicalCards.map((card, i) => {
                      const cardIds = getCardTransactionIds(card.id);
                      const cardTransactions = allTransactions.filter((t) => t.credit_card_id && cardIds.includes(t.credit_card_id));
                      const totalSpent = cardTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
                      const totalReceived = cardTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
                      const isExpanded = expandedCard === card.id;

                      return (
                        <motion.div
                          key={card.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.1 * i }}
                          className="rounded-lg border border-border/60 bg-card overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                            className="w-full p-4 md:p-5 flex items-center justify-between hover:bg-secondary/20 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                <CreditCard className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-medium text-foreground">{card.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {cardTransactions.length} transações • •••{card.last_digits}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                -R$ {totalSpent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </p>
                              {totalReceived > 0 && (
                                <p className="text-[10px] text-green-600 dark:text-green-400">
                                  +R$ {totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </p>
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-border/30 divide-y divide-border/20">
                              {cardTransactions.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-6">Nenhuma transação neste cartão</p>
                              ) : (
                                cardTransactions.map((tx) => (
                                  <div key={tx.id} className="px-4 md:px-5 py-3 flex items-center justify-between">
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-foreground truncate">{tx.description}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {new Date(tx.date).toLocaleDateString("pt-BR")}
                                        {tx.category_id && ` • ${tx.category_id}`}
                                      </p>
                                    </div>
                                    <span className={`text-xs font-medium tabular-nums shrink-0 ml-3 ${
                                      tx.type === "expense" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                                    }`}>
                                      {tx.type === "expense" ? "-" : "+"}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>

          </div>
        </main>
      </div>

      {/* Edit dialog */}
      <Dialog open={editingCardId != null} onOpenChange={(open) => { if (!open) setEditingCardId(null); }}>
        <DialogContent className="sm:max-w-md max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cartão</DialogTitle>
            <DialogDescription>Altere as informações do cartão</DialogDescription>
          </DialogHeader>
          {editingCard && (
            <NewCardForm
              editingCard={editingCard}
              physicalCards={physicalCards}
              onSave={handleSaveCard}
              onCancel={() => setEditingCardId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* New card dialog */}
      <Dialog open={showNewCard} onOpenChange={setShowNewCard}>
        <DialogContent className="sm:max-w-md max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo cartão</DialogTitle>
            <DialogDescription>Adicione um novo cartão de crédito</DialogDescription>
          </DialogHeader>
          <NewCardForm physicalCards={physicalCards} onSave={handleSaveCard} onCancel={() => setShowNewCard(false)} />
        </DialogContent>
      </Dialog>

      {/* Quick expense dialog */}
      <QuickExpenseDialog open={showQuickExpense} onOpenChange={setShowQuickExpense} />

      {/* Delete card confirmation */}
      <AlertDialog open={deletingCardId !== null} onOpenChange={(open) => { if (!open) setDeletingCardId(null); }}>
        <ADContent>
          <ADHeader>
            <ADTitle>Excluir cartão?</ADTitle>
            <ADDescription>
              Todas as faturas e transações associadas a este cartão serão mantidas, mas o cartão será desativado permanentemente.
            </ADDescription>
          </ADHeader>
          <ADFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deletingCardId) {
                  try {
                    await deleteCard(deletingCardId);
                    toast("Cartão excluído");
                  } catch (err) {
                    toast.error("Erro ao excluir cartão");
                  }
                }
                setDeletingCardId(null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Excluir
            </AlertDialogAction>
          </ADFooter>
        </ADContent>
      </AlertDialog>
    </div>
  );
}
