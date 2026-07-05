import { useState, useMemo } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { toast } from "sonner";
import { QuickExpenseDialog } from "@/components/quick-expense-dialog";
import { useRecurringTransactions, RecurringTransaction, isVariableDue } from "@/hooks/use-recurring";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreditCards } from "@/hooks/use-cards";
import { useCategories } from "@/hooks/use-categories";
import {
  Repeat,
  Pencil,
  Trash2,
  Pause,
  Play,
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getNextChargeDate(dayOfMonth: number, frequency: "monthly" | "yearly"): string {
  const now = new Date();
  const currentDay = now.getDate();

  if (frequency === "monthly") {
    const target = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    if (currentDay > dayOfMonth) target.setMonth(target.getMonth() + 1);
    return `${target.getDate()} de ${monthNames[target.getMonth()]}`;
  }

  const target = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (now.getDate() > dayOfMonth) target.setFullYear(target.getFullYear() + 1);
  return `${target.getDate()} de ${monthNames[target.getMonth()]} ${target.getFullYear()}`;
}

function NewRecurringForm({
  onSave,
  onCancel,
  editing,
  accounts,
  creditCards,
  categories,
}: {
  onSave: (data: {
    description: string;
    amount: number;
    type: "income" | "expense" | "transfer";
    account_id: string;
    credit_card_id: string | null;
    category_id: string | null;
    frequency: "monthly" | "yearly";
    day_of_month: number;
    is_active: boolean;
    is_variable: boolean;
  }) => void;
  onCancel: () => void;
  editing?: RecurringTransaction | null;
  accounts: { id: string; name: string }[];
  creditCards: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [type, setType] = useState<"income" | "expense" | "transfer">(editing?.type ?? "expense");
  const [accountId, setAccountId] = useState(editing?.account_id ?? accounts[0]?.id ?? "");
  const [cardId, setCardId] = useState(editing?.credit_card_id ?? "");
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? "");
  const [frequency, setFrequency] = useState<"monthly" | "yearly">(editing?.frequency ?? "monthly");
  const [dayOfMonth, setDayOfMonth] = useState(editing ? String(editing.day_of_month) : String(new Date().getDate()));
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [isVariable, setIsVariable] = useState(editing?.is_variable ?? false);

  const handleSave = () => {
    const numAmount = isVariable ? (Number(amount) || 0) : Number(amount);
    if (!description.trim() || !accountId) return;
    if (!isVariable && !numAmount) return;

    onSave({
      description: description.trim(),
      amount: numAmount,
      type,
      account_id: accountId,
      credit_card_id: cardId || null,
      category_id: categoryId || null,
      frequency,
      day_of_month: Number(dayOfMonth) || 1,
      is_active: isActive,
      is_variable: isVariable,
    });
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Conta de luz, Água..." />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
        <div>
          <p className="text-sm font-medium">{isVariable ? "Valor variável" : "Valor fixo"}</p>
          <p className="text-xs text-muted-foreground">
            {isVariable ? "Você informa o valor quando a conta chegar" : "Valor sempre igual, gera automaticamente"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsVariable(!isVariable)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isVariable ? "bg-primary" : "bg-secondary"
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isVariable ? "translate-x-6" : "translate-x-1"
          }`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{isVariable ? "Último valor (ref.)" : "Valor (R$)"}</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={isVariable ? "Opcional" : "49.90"}
            disabled={false}
          />
          {isVariable && <p className="text-[10px] text-muted-foreground">Referência. O valor real será informado na confirmação.</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors ${
                type === "expense" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`flex-1 h-8 rounded-md text-xs font-medium transition-colors ${
                type === "income" ? "bg-green-600 text-white" : "bg-secondary text-secondary-foreground"
              }`}
            >
              Receita
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Conta</Label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm outline-none"
        >
          <option value="">Selecione...</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Cartão (opcional)</Label>
        <select
          value={cardId}
          onChange={(e) => setCardId(e.target.value)}
          className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm outline-none"
        >
          <option value="">Nenhum</option>
          {creditCards.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm outline-none"
        >
          <option value="">Nenhuma</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Frequência</Label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as "monthly" | "yearly")}
            className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm outline-none"
          >
            <option value="monthly">Mensal</option>
            <option value="yearly">Anual</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Dia do desconto</Label>
          <Input type="number" min="1" max="28" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
        </div>
      </div>

      {editing && (
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Assinatura {isActive ? "ativa" : "pausada"}</p>
            <p className="text-xs text-muted-foreground">{isActive ? "Gerando transações normalmente" : "Pausada, sem gerar"}</p>
          </div>
          <Button variant={isActive ? "destructive" : "default"} size="sm" onClick={() => setIsActive(!isActive)}>
            {isActive ? "Pausar" : "Ativar"}
          </Button>
        </div>
      )}

      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={!description.trim() || (!isVariable && !amount)}>
          {editing ? "Salvar" : "Criar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function Subscriptions() {
  const { user, isLoading: authLoading } = useAuth();
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmAmount, setConfirmAmount] = useState("");

  const { recurring, loading: recurringLoading, createRecurring, updateRecurring, toggleRecurring, deleteRecurring, confirmVariable } = useRecurringTransactions();
  const { accounts } = useAccounts();
  const { cards: creditCards } = useCreditCards();
  const { categories } = useCategories();

  const editing = editingId ? recurring.find((r) => r.id === editingId) ?? null : null;

  const totalMonthly = useMemo(() => {
    return recurring
      .filter((r) => r.is_active)
      .reduce((sum, r) => {
        const monthly = r.frequency === "monthly" ? r.amount : r.amount / 12;
        return r.type === "expense" ? sum + monthly : sum - monthly;
      }, 0);
  }, [recurring]);

  const activeCount = useMemo(() => recurring.filter((r) => r.is_active).length, [recurring]);
  const pendingVariables = useMemo(() => recurring.filter(isVariableDue), [recurring]);

  if (authLoading || recurringLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async (data: {
    description: string;
    amount: number;
    type: "income" | "expense" | "transfer";
    account_id: string;
    credit_card_id: string | null;
    category_id: string | null;
    frequency: "monthly" | "yearly";
    day_of_month: number;
    is_active: boolean;
    is_variable: boolean;
  }) => {
    try {
      if (editingId) {
        await updateRecurring(editingId, data);
        toast("Assinatura atualizada", { description: data.description });
        setEditingId(null);
      } else {
        await createRecurring({
          ...data,
          day_of_week: null,
          start_date: new Date().toISOString(),
          end_date: null,
        });
        toast("Assinatura criada", { description: data.description });
        setShowNew(false);
      }
    } catch {
      toast.error("Erro ao salvar assinatura");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const rec = recurring.find((r) => r.id === deletingId);
      await deleteRecurring(deletingId);
      toast("Assinatura excluída", { description: rec?.description });
    } catch {
      toast.error("Erro ao excluir assinatura");
    }
    setDeletingId(null);
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await toggleRecurring(id, !currentActive);
      toast(currentActive ? "Assinatura pausada" : "Assinatura ativada");
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const handleConfirmVariable = async () => {
    if (!confirmingId || !confirmAmount) return;
    const val = Number(confirmAmount);
    if (!val || val <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    try {
      const rec = recurring.find((r) => r.id === confirmingId);
      await confirmVariable(confirmingId, val);
      toast("Pagamento confirmado", { description: `${rec?.description} — R$ ${formatCurrency(val)}` });
      setConfirmingId(null);
      setConfirmAmount("");
    } catch {
      toast.error("Erro ao confirmar pagamento");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col md:flex-row">
        <main className="flex-1 pb-20 md:pb-6">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <MobileHeader
              icon={Repeat}
              title="Assinaturas"
              description="Gerencie seus gastos recorrentes"
              onPlus={() => setShowNew(true)}
              plusTitle="Nova assinatura"
            />

            {/* Alerta de variáveis pendentes */}
            {pendingVariables.length > 0 && (
              <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800/30 p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                    {pendingVariables.length} conta(s) pendente(s) de valor
                  </span>
                </div>
                {pendingVariables.map((rec) => (
                  <button
                    key={rec.id}
                    onClick={() => { setConfirmingId(rec.id); setConfirmAmount(rec.amount > 0 ? String(rec.amount) : ""); }}
                    className="w-full flex items-center justify-between py-2 border-t border-amber-200/40 dark:border-amber-800/20 first:border-0"
                  >
                    <span className="text-xs text-amber-800 dark:text-amber-200">{rec.description}</span>
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Preencher valor →</span>
                  </button>
                ))}
              </div>
            )}

            {/* Resumo */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg border border-border/60 bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  {totalMonthly >= 0 ? <TrendingDown className="h-4 w-4 text-red-500" /> : <TrendingUp className="h-4 w-4 text-green-500" />}
                  <span className="text-xs text-muted-foreground">Total mensal</span>
                </div>
                <p className="text-lg font-semibold tabular-nums">R$ {formatCurrency(Math.abs(totalMonthly))}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Ativas</span>
                </div>
                <p className="text-lg font-semibold">{activeCount}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">Assinaturas</h2>
              <Button size="sm" onClick={() => setShowNew(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nova
              </Button>
            </div>

            {/* Lista */}
            {recurring.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Repeat className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma assinatura cadastrada</p>
                <p className="text-xs mt-1">Crie assinaturas para acompanhar gastos recorrentes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recurring.map((rec) => {
                  const due = isVariableDue(rec);
                  return (
                    <div
                      key={rec.id}
                      className={`rounded-lg border bg-card p-4 transition-opacity ${
                        due ? "border-amber-300/60 dark:border-amber-700/40" : "border-border/60"
                      } ${!rec.is_active ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-foreground truncate">{rec.description}</h3>
                            {rec.is_variable && (
                              <Badge variant={due ? "default" : "secondary"} className={`text-[10px] shrink-0 ${due ? "bg-amber-500 text-white" : ""}`}>
                                {due ? "Pendente" : "Variável"}
                              </Badge>
                            )}
                            {!rec.is_active && (
                              <Badge variant="outline" className="text-[10px] shrink-0">Pausada</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className={`text-xs font-medium ${rec.type === "expense" ? "text-red-500" : "text-green-500"}`}>
                              {rec.type === "expense" ? "-" : "+"} R$ {formatCurrency(rec.amount)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {rec.frequency === "monthly" ? "Mensal" : "Anual"} · dia {rec.day_of_month}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">
                              {due ? "Venceu! Informe o valor" : `Próximo: ${getNextChargeDate(rec.day_of_month, rec.frequency)}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {due && (
                            <button
                              onClick={() => { setConfirmingId(rec.id); setConfirmAmount(rec.amount > 0 ? String(rec.amount) : ""); }}
                              className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                              title="Preencher valor"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggle(rec.id, rec.is_active)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                            title={rec.is_active ? "Pausar" : "Ativar"}
                          >
                            {rec.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            onClick={() => setEditingId(rec.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(rec.id)}
                            className="p-1.5 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileBottomNav currentPath="/subscriptions" onQuickExpense={() => setShowQuickExpense(true)} />
      <QuickExpenseDialog open={showQuickExpense} onOpenChange={setShowQuickExpense} />

      {/* Dialog: confirmar valor variável */}
      <Dialog open={confirmingId !== null} onOpenChange={(open) => { if (!open) { setConfirmingId(null); setConfirmAmount(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar pagamento</DialogTitle>
            <DialogDescription>
              Informe o valor de <strong>{recurring.find((r) => r.id === confirmingId)?.description}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                value={confirmAmount}
                onChange={(e) => setConfirmAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setConfirmingId(null); setConfirmAmount(""); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleConfirmVariable} disabled={!confirmAmount || Number(confirmAmount) <= 0}>
              <Check className="h-4 w-4 mr-1" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: nova / editar assinatura */}
      <Dialog open={showNew || editingId !== null} onOpenChange={(open) => { if (!open) { setShowNew(false); setEditingId(null); } }}>
        <DialogContent className="sm:max-w-md max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar assinatura" : "Nova assinatura"}</DialogTitle>
            <DialogDescription>{editing ? "Altere os dados da assinatura" : "Configure uma recorrência"}</DialogDescription>
          </DialogHeader>
          <NewRecurringForm
            editing={editing}
            accounts={accounts}
            creditCards={creditCards}
            categories={categories}
            onSave={handleSave}
            onCancel={() => { setShowNew(false); setEditingId(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* AlertDialog: excluir */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <ADContent>
          <ADHeader>
            <ADTitle>Excluir assinatura?</ADTitle>
            <ADDescription>Esta ação não pode ser desfeita. Transações já geradas serão mantidas.</ADDescription>
          </ADHeader>
          <ADFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Excluir
            </AlertDialogAction>
          </ADFooter>
        </ADContent>
      </AlertDialog>
    </div>
  );
}
