import { useState, useMemo } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { toast } from "sonner";
import { QuickExpenseDialog } from "@/components/quick-expense-dialog";
import { useBudgets, BudgetWithSpent, getBudgetStatus } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maiho", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BudgetBar({ budget }: { budget: BudgetWithSpent }) {
  const { percentage, status } = getBudgetStatus(budget, budget.spent);
  const barColor = status === "danger" ? "bg-red-500" : status === "warning" ? "bg-amber-500" : "bg-green-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground">{budget.category_id ? `Categoria` : "Geral"}</span>
        <span className="text-[10px] text-muted-foreground">{percentage}%</span>
      </div>
      <Progress value={Math.min(100, percentage)} className="h-2" />
    </div>
  );
}

function BudgetForm({
  onSave,
  onCancel,
  editing,
  categories,
  existingCategoryIds,
  month,
  year,
}: {
  onSave: (data: { category_id: string; amount: number; month: number; year: number }) => void;
  onCancel: () => void;
  editing?: BudgetWithSpent | null;
  categories: { id: string; name: string; icon: string | null }[];
  existingCategoryIds: Set<string>;
  month: number;
  year: number;
}) {
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");

  const availableCategories = editing
    ? categories
    : categories.filter((c) => !existingCategoryIds.has(c.id));

  const handleSave = () => {
    const numAmount = Number(amount);
    if (!categoryId || !numAmount) return;
    onSave({ category_id: categoryId, amount: numAmount, month, year });
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>Categoria</Label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={!!editing}
          className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm outline-none disabled:opacity-50"
        >
          <option value="">Selecione...</option>
          {availableCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Limite mensal (R$)</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="500.00"
        />
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={!categoryId || !amount}>
          {editing ? "Salvar" : "Criar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function BudgetCategories() {
  const { user, isLoading: authLoading } = useAuth();
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { budgets, loading: budgetsLoading, createBudget, updateBudget, deleteBudget } = useBudgets(month, year);
  const { categories } = useCategories();

  const editing = editingId ? budgets.find((b) => b.id === editingId) ?? null : null;

  const categoryMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; icon: string | null }>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const existingCategoryIds = useMemo(() => new Set(budgets.map((b) => b.category_id)), [budgets]);

  const totalBudget = useMemo(() => budgets.reduce((s, b) => s + b.amount, 0), [budgets]);
  const totalSpent = useMemo(() => budgets.reduce((s, b) => s + b.spent, 0), [budgets]);
  const totalPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  if (authLoading || budgetsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async (data: { category_id: string; amount: number; month: number; year: number }) => {
    try {
      if (editingId) {
        await updateBudget(editingId, { amount: data.amount });
        toast("Orçamento atualizado");
        setEditingId(null);
      } else {
        await createBudget(data);
        toast("Orçamento criado");
        setShowNew(false);
      }
    } catch {
      toast.error("Erro ao salvar orçamento");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteBudget(deletingId);
      toast("Orçamento excluído");
    } catch {
      toast.error("Erro ao excluir orçamento");
    }
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col md:flex-row">
        <main className="flex-1 pb-20 md:pb-6">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <MobileHeader
              icon={Target}
              title="Orçamento"
              description="Controle seus gastos por categoria"
              onPlus={() => setShowNew(true)}
              plusTitle="Novo orçamento"
            />

            {/* Navegação mês */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="p-2 rounded-md hover:bg-secondary/50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-center">
                <p className="text-sm font-medium">{monthNames[month - 1]} {year}</p>
              </div>
              <button onClick={nextMonth} className="p-2 rounded-md hover:bg-secondary/50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Resumo */}
            {budgets.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-card p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Total do mês</span>
                  <span className={`text-xs font-medium ${
                    totalPercentage >= 90 ? "text-red-500" : totalPercentage >= 70 ? "text-amber-500" : "text-green-500"
                  }`}>
                    {totalPercentage}%
                  </span>
                </div>
                <Progress value={Math.min(100, totalPercentage)} className="h-2 mb-2" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Gasto: <span className="text-foreground font-medium">R$ {formatCurrency(totalSpent)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Limite: <span className="text-foreground font-medium">R$ {formatCurrency(totalBudget)}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Gráfico de barras por categoria */}
            {budgets.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-card p-4 mb-6">
                <h3 className="text-sm font-medium mb-3">Consumo por categoria</h3>
                <div className="space-y-3">
                  {budgets.map((b) => {
                    const cat = categoryMap.get(b.category_id);
                    const { percentage, status } = getBudgetStatus(b, b.spent);
                    const barColor = status === "danger" ? "bg-red-500" : status === "warning" ? "bg-amber-500" : "bg-green-500";
                    return (
                      <div key={b.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground truncate">{cat?.icon} {cat?.name ?? "Sem nome"}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            R$ {formatCurrency(b.spent)} / R$ {formatCurrency(b.amount)}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-secondary/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lista de orçamentos */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">Categorias</h2>
              <Button size="sm" onClick={() => setShowNew(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nova
              </Button>
            </div>

            {budgets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum orçamento definido</p>
                <p className="text-xs mt-1">Crie orçamentos para controlar gastos por categoria</p>
              </div>
            ) : (
              <div className="space-y-2">
                {budgets.map((b) => {
                  const cat = categoryMap.get(b.category_id);
                  const { percentage, status } = getBudgetStatus(b, b.spent);
                  return (
                    <div key={b.id} className="rounded-lg border border-border/60 bg-card p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{cat?.icon ?? "📁"}</span>
                            <h3 className="text-sm font-medium text-foreground truncate">{cat?.name ?? "Sem nome"}</h3>
                            <Badge
                              variant={status === "danger" ? "destructive" : "secondary"}
                              className={`text-[10px] shrink-0 ${
                                status === "ok" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                status === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : ""
                              }`}
                            >
                              {status === "ok" ? "No limite" : status === "warning" ? "Atenção" : "Limite"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-muted-foreground">
                              R$ {formatCurrency(b.spent)} / R$ {formatCurrency(b.amount)}
                            </span>
                            <span className={`text-xs font-medium ${
                              status === "danger" ? "text-red-500" : status === "warning" ? "text-amber-500" : "text-green-500"
                            }`}>
                              {percentage}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min(100, percentage)}
                            className={`h-1.5 mt-2 ${
                              status === "danger" ? "[&>div]:bg-red-500" :
                              status === "warning" ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"
                            }`}
                          />
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => setEditingId(b.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(b.id)}
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

      <MobileBottomNav currentPath="/budgets" onQuickExpense={() => setShowQuickExpense(true)} />
      <QuickExpenseDialog open={showQuickExpense} onOpenChange={setShowQuickExpense} />

      {/* Dialog: nova / editar orçamento */}
      <Dialog open={showNew || editingId !== null} onOpenChange={(open) => { if (!open) { setShowNew(false); setEditingId(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
            <DialogDescription>
              {editing ? "Altere o limite da categoria" : `Defina o limite para ${monthNames[month - 1]}`}
            </DialogDescription>
          </DialogHeader>
          <BudgetForm
            editing={editing}
            categories={categories}
            existingCategoryIds={existingCategoryIds}
            month={month}
            year={year}
            onSave={handleSave}
            onCancel={() => { setShowNew(false); setEditingId(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* AlertDialog: excluir */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <ADContent>
          <ADHeader>
            <ADTitle>Excluir orçamento?</ADTitle>
            <ADDescription>Esta ação não pode ser desfeita.</ADDescription>
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
