import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, CreditCard, DollarSign, Landmark } from "lucide-react";
import { useCreditCards } from "@/hooks/use-cards";
import { useTransactions } from "@/hooks/use-transactions";
import { useInvoices } from "@/hooks/use-invoices";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";

interface QuickExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickExpenseDialog({ open, onOpenChange }: QuickExpenseDialogProps) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "debit" | "credit">("cash");
  const [cardId, setCardId] = useState("");
  const [installments, setInstallments] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const { cards: creditCards, updateCardLimit } = useCreditCards();
  const { createTransaction } = useTransactions();
  const { invoices, createInvoice, updateInvoice } = useInvoices();
  const { accounts } = useAccounts();
  const { categories, createCategory } = useCategories();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Limite efetivo: para virtual, pega o limite do pai físico
  const getEffectiveLimit = (card: { id: string; parent_card_id: string | null; available_limit: number }) => {
    if (card.parent_card_id) {
      const parent = creditCards.find((c) => c.id === card.parent_card_id);
      return parent?.available_limit ?? 0;
    }
    return card.available_limit;
  };

  const reset = () => {
    setType("expense");
    setAmount("");
    setDescription("");
    setCategory("");
    setPaymentMethod("cash");
    setCardId("");
    setInstallments("1");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const created = await createCategory({
        name: newCategoryName.trim(),
        icon: null,
        color: null,
        is_default: false,
        parent_id: null,
      });
      setCategory(created.name);
      setNewCategoryName("");
      setIsAddingCategory(false);
      toast("Categoria criada");
    } catch (err) {
      toast("Erro ao criar categoria");
    }
  };

  const handleSave = async () => {
    if (!amount || !description) return;
    if (paymentMethod !== "cash" && !cardId) return;

    const numAmount = parseFloat(amount);
    const numInstallments = parseInt(installments) || 1;
    const selectedCard = creditCards.find((c) => c.id === cardId);
    const groupId = crypto.randomUUID();
    const now = new Date();

    const baseTx = {
      type,
      amount: numAmount,
      description,
      date: new Date(date + "T12:00:00").toISOString(),
      account_id: paymentMethod === "credit"
        ? (selectedCard?.account_id || accounts[0]?.id || "")
        : cardId,
      credit_card_id: paymentMethod === "credit" ? cardId : null,
      category_id: null as string | null,
      installment_count: numInstallments > 1 ? numInstallments : null,
      installment_group_id: numInstallments > 1 ? groupId : null,
      destination_account_id: null as string | null,
      settlement_tag: "normal",
      settled_person_id: null as string | null,
      notes: null as string | null,
      is_recurring: false,
      recurring_id: null as string | null,
      client_id: null as string | null,
    };

    const installmentAmount = numInstallments > 1 ? numAmount / numInstallments : numAmount;

    // Criar primeira parcela
    await createTransaction({
      ...baseTx,
      amount: installmentAmount,
      installment_number: 1,
    });

      // Atualizar limite do cartão se for despesa no crédito
      if (paymentMethod === "credit" && type === "expense" && cardId) {
        await updateCardLimit(cardId, -installmentAmount);
      }

    // Criar parcelas restantes
    if (numInstallments > 1) {
      for (let i = 2; i <= numInstallments; i++) {
        await createTransaction({
          ...baseTx,
          amount: installmentAmount,
          installment_number: i,
        });
      }

      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const existingInvoice = invoices.find(
        (inv) => inv.credit_card_id === cardId && inv.month === currentMonth && inv.year === currentYear,
      );

      if (existingInvoice) {
        await updateInvoice(existingInvoice.id, {
          total_amount: existingInvoice.total_amount + installmentAmount,
          is_paid: false,
        });
      } else {
        const dueDate = new Date(currentYear, currentMonth, 10);
        const closingDate = new Date(currentYear, currentMonth, 3);
        await createInvoice({
          credit_card_id: cardId,
          month: currentMonth,
          year: currentYear,
          total_amount: installmentAmount,
          paid_amount: 0,
          is_paid: false,
          due_date: dueDate.toISOString().split("T")[0],
          closing_date: closingDate.toISOString().split("T")[0],
          rent_abatement_amount: null,
          sync_status: "synced",
        });
      }
    }

    if (paymentMethod === "credit" && numInstallments === 1) {
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const existingInvoice = invoices.find(
        (inv) => inv.credit_card_id === cardId && inv.month === currentMonth && inv.year === currentYear,
      );

      if (existingInvoice) {
        await updateInvoice(existingInvoice.id, {
          total_amount: existingInvoice.total_amount + numAmount,
          is_paid: false,
        });
      } else {
        const dueDate = new Date(currentYear, currentMonth, 10);
        const closingDate = new Date(currentYear, currentMonth, 3);
        await createInvoice({
          credit_card_id: cardId,
          month: currentMonth,
          year: currentYear,
          total_amount: numAmount,
          paid_amount: 0,
          is_paid: false,
          due_date: dueDate.toISOString().split("T")[0],
          closing_date: closingDate.toISOString().split("T")[0],
          rent_abatement_amount: null,
          sync_status: "synced",
        });
      }
    }

    toast(
      type === "expense" ? "Despesa registrada" : "Receita registrada",
      { description: `R$ ${numAmount.toFixed(2)} — ${description}${numInstallments > 1 ? ` (${numInstallments}x)` : ""}` },
    );
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova transação</DialogTitle>
          <DialogDescription>
            Registre uma entrada ou saída rápida
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex rounded-lg border border-border/60 overflow-hidden">
            <button
              onClick={() => setType("expense")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                type === "expense"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingDown className="h-3.5 w-3.5 inline mr-1" />
              Despesa
            </button>
            <button
              onClick={() => setType("income")}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                type === "income"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
              Receita
            </button>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Valor (R$)</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Descrição</label>
            <Input
              placeholder="Ex: Supermercado"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Data</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Categoria</label>
            {isAddingCategory ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da categoria"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCategory();
                    if (e.key === "Escape") { setIsAddingCategory(false); setNewCategoryName(""); }
                  }}
                />
                <Button size="sm" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm shadow-xs outline-none flex-1"
                >
                  <option value="">Selecione...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={() => setIsAddingCategory(true)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Forma de pagamento</label>
            <div className="flex rounded-lg border border-border/60 overflow-hidden">
              <button
                onClick={() => setPaymentMethod("cash")}
                className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                  paymentMethod === "cash"
                    ? "bg-green-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <DollarSign className="h-3.5 w-3.5 inline mr-1" />
                Dinheiro
              </button>
              <button
                onClick={() => setPaymentMethod("debit")}
                className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                  paymentMethod === "debit"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Landmark className="h-3.5 w-3.5 inline mr-1" />
                Débito
              </button>
              <button
                onClick={() => setPaymentMethod("credit")}
                className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                  paymentMethod === "credit"
                    ? "bg-purple-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5 inline mr-1" />
                Crédito
              </button>
            </div>
          </div>

          {paymentMethod === "credit" && (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Cartão</label>
                <select
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm shadow-xs outline-none"
                >
                  <option value="">Selecione o cartão...</option>
                  {creditCards.filter((c) => c.status === "active").map((c) => {
                    const limit = getEffectiveLimit(c);
                    const label = c.parent_card_id ? `${c.name} ••••${c.last_digits || ""} (virtual)` : `${c.name} ••••${c.last_digits || ""}`;
                    return (
                      <option key={c.id} value={c.id}>{label} — R$ {limit.toLocaleString("pt-BR")} disponível</option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Parcelas</label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm shadow-xs outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {i === 0 ? "À vista" : `${i + 1}x`}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {paymentMethod !== "credit" && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Conta</label>
              <select
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="flex w-full h-8 items-center rounded-md border px-3 py-1 text-sm shadow-xs outline-none"
              >
                <option value="">Selecione...</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!amount || !description || (paymentMethod === "credit" && !cardId)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {type === "expense" ? "Registrar despesa" : "Registrar receita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
