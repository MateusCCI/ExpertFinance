import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  AlertDialogContent,
  AlertDialogDescription as ADDescription,
  AlertDialogFooter as ADFooter,
  AlertDialogHeader as ADHeader,
  AlertDialogTitle as ADTitle,
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
import { useCreditCards } from "@/hooks/use-cards";
import { useRent } from "@/hooks/use-rent";
import { useLandlordPurchases } from "@/hooks/use-landlord-purchases";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { useTheme } from "next-themes";
import { Navigate } from "react-router";
import { toast } from "sonner";
import { QuickExpenseDialog } from "@/components/quick-expense-dialog";
import {
  Target,
  Landmark,
  LogOut,
  LayoutDashboard,
  List,
  CreditCard,
  Users,
  Settings,
  BarChart3,
  Wallet,
  Home,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Plus,
  RefreshCw,
  ShoppingCart,
  DollarSign,
  Building,
  Moon,
  Sun,
  Trash2,
  Pencil,
} from "lucide-react";
import { differenceInDays, parseISO, startOfMonth } from "date-fns";

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


// Mock data for landlord purchases (no Supabase hook for individual purchases yet)
export default function RentPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [rentIsPaid, setRentIsPaid] = useState(false);

  const { purchases: landlordPurchases, loading: purchasesLoading, addPurchase, deletePurchase } = useLandlordPurchases();

  const { accounts: supabaseAccounts } = useAccounts();
  const { cards: supabaseCards } = useCreditCards();
  const { config: rentConfig, loading: rentLoading, saveConfig, updateSpending } = useRent();

  // Modal states
  const [showConfig, setShowConfig] = useState(false);
  const [showRecordPurchase, setShowRecordPurchase] = useState(false);
  const [showPayRent, setShowPayRent] = useState(false);

  // Config form
  const [landlordName, setLandlordName] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [pixKey, setPixKey] = useState("");

  // Sync form state when rentConfig loads from Supabase
  useEffect(() => {
    if (rentConfig) {
      setLandlordName(rentConfig.landlord_name);
      setRentAmount(String(rentConfig.monthly_rent_amount));
      setDueDay(String(rentConfig.due_day));
      setPixKey(rentConfig.pix_key ?? "");
    }
  }, [rentConfig]);

  // Purchase form
  const [purchaseCardId, setPurchaseCardId] = useState<string | undefined>(undefined);
  const [purchaseAccountId, setPurchaseAccountId] = useState<string | undefined>(undefined);
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseDescription, setPurchaseDescription] = useState("");
  const [purchaseType, setPurchaseType] = useState<"single" | "installment" | "recurring">("single");
  const [purchaseInstallments, setPurchaseInstallments] = useState("2");

  // Pay form
  const [payAccountId, setPayAccountId] = useState<string | undefined>(undefined);
  const [deletePurchaseId, setDeletePurchaseId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || rentLoading) {
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

  function handleSaveConfig() {
    saveConfig({
      landlord_name: landlordName,
      monthly_rent_amount: parseFloat(rentAmount) || 0,
      due_day: parseInt(dueDay) || 5,
      pix_key: pixKey || null,
      accumulated_landlord_spending: rentConfig?.accumulated_landlord_spending ?? 0,
      payment_account_id: rentConfig?.payment_account_id ?? null,
    }).then(() => {
      toast("Configuração salva", {
        description: `${landlordName} • R$ ${parseFloat(rentAmount).toFixed(2)} • Dia ${dueDay}`,
      });
      setShowConfig(false);
    }).catch((err) => {
      console.error("Erro ao salvar aluguel:", err);
      toast.error("Erro ao salvar", { description: err?.message ?? "Verifique o console" });
    });
  }

  function handleRecordPurchase() {
    if ((!purchaseCardId && !purchaseAccountId) || !purchaseAmount) return;
    const amount = parseFloat(purchaseAmount);
    const sourceName = purchaseCardId
      ? supabaseCards.find((c) => c.id === purchaseCardId)?.name || "Cartão"
      : supabaseAccounts.find((a) => a.id === purchaseAccountId)?.name || "Conta";
    const sourceType = purchaseCardId ? "card" : "account";
    const installments = parseInt(purchaseInstallments) || 2;

    addPurchase({
      description: purchaseDescription || "Compra",
      amount,
      source_name: sourceName,
      source_type: sourceType,
      purchase_type: purchaseType,
      installment_current: purchaseType === "installment" ? 1 : null,
      installment_total: purchaseType === "installment" ? installments : null,
      purchase_date: new Date().toISOString().split("T")[0],
    }).then(() => {
      updateSpending(amount).catch(() => {});
      const typeLabel = purchaseType === "installment" ? `${installments}x` : purchaseType === "recurring" ? "Mensal" : "À vista";
      toast("Consumo registrado", { description: `R$ ${amount.toFixed(2)} — ${sourceName} • ${typeLabel}` });
    }).catch((err) => {
      toast.error("Erro ao registrar", { description: err?.message });
    });

    setPurchaseCardId(undefined);
    setPurchaseAccountId(undefined);
    setPurchaseAmount("");
    setPurchaseDescription("");
    setPurchaseType("single");
    setShowRecordPurchase(false);
  }

  function handlePayRent() {
    if (!payAccountId) return;
    setRentIsPaid(true);
    toast("Aluguel pago", {
      description: `R$ ${formatCurrency(residualToPay)} — PIX ${rentConfig?.landlord_name ?? "Proprietário"}`,
    });
    setPayAccountId(undefined);
    setShowPayRent(false);
  }

  const totalSpending = landlordPurchases.reduce((s, p) => s + p.amount, 0);
  const monthlyRent = rentConfig?.monthly_rent_amount ?? 0;
  const residualToPay = rentIsPaid ? 0 : Math.max(0, monthlyRent - totalSpending);
  const abatementPercent = monthlyRent > 0 ? (totalSpending / monthlyRent) * 100 : 0;

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
                item.id === "rent"
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
        icon={Landmark}
        title="Aluguel"
        description="Controle de aluguéis e locações"
        onRefresh={() => {}}
        onPlus={() => setShowQuickExpense(true)}
        plusTitle="Nova transação"
      />

      <MobileBottomNav currentPath="/rent" onQuickExpense={() => setShowQuickExpense(true)} />

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-6">
        <div className="w-full px-3 md:px-8 md:max-w-6xl md:mx-auto py-6 md:py-10">
          {/* Landlord info card — compact */}
          {(() => {
            const dueDay = rentConfig?.due_day ?? 5;
            const now = new Date();
            const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
            if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);
            const daysUntilDue = differenceInDays(dueDate, now);
            return (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="flex items-center justify-between p-3 md:p-4 rounded-lg border border-border/60 bg-card mb-4"
              >
                <div className="flex items-center gap-2 min-w-0 text-[11px] md:text-xs text-muted-foreground">
                  <Home className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium text-foreground truncate">{rentConfig?.landlord_name ?? "Proprietário"}</span>
                  <span>•</span>
                  <span className="tabular-nums">R$ {formatCurrency(monthlyRent)}</span>
                  <span>•</span>
                  <span>Vence dia {dueDay}</span>
                  <span>•</span>
                  <span className={`tabular-nums ${daysUntilDue <= 3 ? "text-amber-600 dark:text-amber-400 font-medium" : ""}`}>
                    {daysUntilDue === 0 ? "Vence hoje" : `em ${daysUntilDue}d`}
                  </span>
                  {rentIsPaid && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                </div>
                <button
                  onClick={() => setShowConfig(true)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors shrink-0 ml-2"
                  title="Editar configuração"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })()}

          {/* Cross-settlement calculation */}
          <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="p-3 md:p-4 rounded-lg border border-border/60 bg-card"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] md:text-xs text-muted-foreground">Aluguel</span>
                <Home className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
              <span className="text-base md:text-xl font-light tracking-tight">R$ {formatCurrency(monthlyRent)}</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="p-3 md:p-4 rounded-lg border border-border/60 bg-card"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] md:text-xs text-muted-foreground">Abatido</span>
                <TrendingDown className="h-3.5 w-3.5 text-green-600/60" />
              </div>
              <span className="text-base md:text-xl font-light tracking-tight text-green-700 dark:text-green-400">-R$ {formatCurrency(totalSpending)}</span>
              <Progress value={abatementPercent} className="h-1 mt-2" />
              <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">{abatementPercent.toFixed(0)}%</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className={`p-3 md:p-4 rounded-lg border bg-card ${
                residualToPay > 0 ? "border-amber-200 dark:border-amber-800" : "border-green-200 dark:border-green-800"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] md:text-xs text-muted-foreground">
                  {totalSpending > monthlyRent ? "Crédito" : "Residual"}
                </span>
                {rentIsPaid ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : totalSpending > monthlyRent ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <DollarSign className={`h-3.5 w-3.5 ${residualToPay > 0 ? "text-amber-500" : "text-green-500"}`} />
                )}
              </div>
              <span className={`text-base md:text-xl font-light tracking-tight ${
                totalSpending > monthlyRent
                  ? "text-green-700 dark:text-green-400"
                  : residualToPay <= 0
                    ? "text-green-700 dark:text-green-400"
                    : "text-foreground"
              }`}>
                {totalSpending > monthlyRent
                  ? `+R$ ${formatCurrency(totalSpending - monthlyRent)}`
                  : `R$ ${formatCurrency(residualToPay)}`
                }
              </span>
              {totalSpending > monthlyRent && (
                <p className="text-[9px] md:text-[10px] text-green-600 dark:text-green-400 mt-1">
                  Saldo a favor no próximo mês
                </p>
              )}
              {residualToPay > 0 && !rentIsPaid && (
                <Button size="sm" className="mt-2 w-full text-[10px] h-7" onClick={() => setShowPayRent(true)}>
                  Pagar
                </Button>
              )}
            </motion.div>
          </div>

          {/* Landlord consumption history */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="rounded-lg border border-border/60 bg-card"
          >
            <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">
                  Consumo do Proprietário
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => setShowRecordPurchase(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar
              </Button>
            </div>

            <div className="divide-y divide-border/30">
              {landlordPurchases.map((purchase) => {
                const typeBadge = purchase.purchase_type === "installment"
                  ? `${purchase.installment_current}x/${purchase.installment_total}x`
                  : purchase.purchase_type === "recurring" ? "Mensal" : null;
                return (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-foreground">{purchase.description}</p>
                          {typeBadge && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{typeBadge}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {purchase.purchase_date} • {purchase.source_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeletePurchaseId(purchase.id)}
                        className="p-1.5 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        title="Excluir compra"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        R$ {formatCurrency(purchase.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-border/30 bg-muted/20 rounded-b-lg flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total do mês</span>                <span className="text-sm font-medium tabular-nums">
                R$ {formatCurrency(totalSpending)}
              </span>
            </div>
          </motion.div>
        </div>
      </main>
      </div>

      {/* Quick expense dialog */}
      <QuickExpenseDialog open={showQuickExpense} onOpenChange={setShowQuickExpense} />

      {/* Delete purchase confirmation */}
      <AlertDialog open={deletePurchaseId !== null} onOpenChange={(open) => { if (!open) setDeletePurchaseId(null); }}>
        <AlertDialogContent>
          <ADHeader>
            <ADTitle>Excluir compra?</ADTitle>
            <ADDescription>
              Este consumo do proprietário será removido e o abatimento do aluguel será recalculado.
            </ADDescription>
          </ADHeader>
          <ADFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletePurchaseId) {
                  const deleted = landlordPurchases.find((p) => p.id === deletePurchaseId);
                  deletePurchase(deletePurchaseId).then(() => {
                    if (deleted) updateSpending(-deleted.amount).catch(() => {});
                    toast("Consumo excluído");
                  }).catch(() => toast.error("Erro ao excluir"));
                }
                setDeletePurchaseId(null);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Excluir
            </AlertDialogAction>
          </ADFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Config */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar aluguel</DialogTitle>
            <DialogDescription>
              Informe os dados do seu contrato de aluguel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Nome do proprietário</label>
              <Input value={landlordName} onChange={(e) => setLandlordName(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Valor do aluguel (R$)</label>
              <Input type="number" step="0.01" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Dia de vencimento</label>
              <Input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Chave PIX (opcional)</label>
              <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowConfig(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSaveConfig} disabled={!landlordName || !rentAmount || !dueDay}>
              <Building className="h-3.5 w-3.5 mr-1.5" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Record landlord purchase */}
      <Dialog open={showRecordPurchase} onOpenChange={setShowRecordPurchase}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Consumo do proprietário</DialogTitle>
            <DialogDescription>
              Registre uma compra que o proprietário fez no seu cartão. Isso abaterá do aluguel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Cartão</label>
                <select
                  value={purchaseCardId ?? ""}
                  onChange={(e) => { setPurchaseCardId(e.target.value || undefined); if (e.target.value) setPurchaseAccountId(undefined); }}
                  className="flex w-full h-8 items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 outline-none"
                >
                  <option value="">Cartão...</option>
                  {supabaseCards.map((card) => (
                    <option key={card.id} value={card.id}>{card.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Ou conta (PIX/Dinheiro)</label>
                <select
                  value={purchaseAccountId ?? ""}
                  onChange={(e) => { setPurchaseAccountId(e.target.value || undefined); if (e.target.value) setPurchaseCardId(undefined); }}
                  className="flex w-full h-8 items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 outline-none"
                >
                  <option value="">Conta...</option>
                  {supabaseAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name} (R$ {formatCurrency(acc.balance)})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "single", label: "À vista" },
                { value: "installment", label: "Parcelado" },
                { value: "recurring", label: "Mensal" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPurchaseType(opt.value as typeof purchaseType)}
                  className={`py-2 px-2 rounded-md border text-xs font-medium transition-colors ${
                    purchaseType === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {purchaseType === "installment" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Parcelas</label>
                <Select value={purchaseInstallments} onValueChange={setPurchaseInstallments}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}x de R$ {formatCurrency(parseFloat(purchaseAmount || "0") / n)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Valor (R$)</label>
              <Input type="number" step="0.01" min="0.01" placeholder="0,00" value={purchaseAmount} onChange={(e) => setPurchaseAmount(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Descrição</label>
              <Input placeholder="Ex: Supermercado" value={purchaseDescription} onChange={(e) => setPurchaseDescription(e.target.value)} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowRecordPurchase(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleRecordPurchase} disabled={(!purchaseCardId && !purchaseAccountId) || !purchaseAmount}>
              <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Pay rent */}
      <Dialog open={showPayRent} onOpenChange={setShowPayRent}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Pagar aluguel</DialogTitle>
            <DialogDescription>
              {"Junho"}/{2026} — Pagamento do saldo residual via PIX
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-3 rounded-lg bg-secondary/30 mb-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Aluguel</span>
                <span>R$ {formatCurrency(monthlyRent)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Abatido (consumo proprietário)</span>
                <span className="text-green-600">- R$ {formatCurrency(totalSpending)}</span>
              </div>
              <div className="border-t border-border/30 pt-2 flex justify-between text-sm font-medium">
                <span>Saldo residual a pagar</span>
                <span>R$ {formatCurrency(residualToPay)}</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Conta para débito</label>
              <select
                value={payAccountId ?? ""}
                onChange={(e) => setPayAccountId(e.target.value || undefined)}
                className="flex w-full h-8 items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 outline-none"
              >
                <option value="">Selecione a conta...</option>
                {supabaseAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name} (R$ {formatCurrency(acc.balance)})</option>
                ))}
              </select>
            </div>
            {rentConfig?.pix_key && (
              <p className="text-xs text-muted-foreground mt-3">
                PIX: <span className="font-mono">{rentConfig?.pix_key}</span> — {rentConfig?.landlord_name ?? "Proprietário"}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowPayRent(false)}>Cancelar</Button>
            <Button size="sm" onClick={handlePayRent} disabled={!payAccountId}>
              <DollarSign className="h-3.5 w-3.5 mr-1.5" />
              Pagar R$ {formatCurrency(residualToPay)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
