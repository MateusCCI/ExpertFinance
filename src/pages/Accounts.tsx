import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate, Navigate } from "react-router";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useAuth } from "@/hooks/use-auth";
import { MobileHeader } from "@/components/mobile-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { QuickExpenseDialog } from "@/components/quick-expense-dialog";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useAccounts, type Account } from "@/hooks/use-accounts";
import {
  LayoutDashboard,
  List,
  CreditCard,
  Landmark,
  Users,
  Target,
  BarChart3,
  Settings,
  Wallet,
  Pencil,
  Trash2,
  Moon,
  Sun,
  LogOut,
  Building2,
  CircleDollarSign,
  PiggyBank,
  TrendingUp,
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

const typeConfig: Record<string, { label: string; icon: React.ElementType }> = {
  checking: { label: "Conta Corrente", icon: Building2 },
  savings: { label: "Poupança", icon: PiggyBank },
  cash: { label: "Dinheiro Físico", icon: CircleDollarSign },
  investment: { label: "Investimento", icon: TrendingUp },
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function AccountForm({ onSave, onCancel, editingAccount }: { onSave: (a: Omit<Account, "user_id" | "created_at" | "updated_at" | "sync_status">) => void; onCancel: () => void; editingAccount?: Account | null }) {
  const [name, setName] = useState(editingAccount?.name ?? "");
  const [type, setType] = useState<Account["type"]>(editingAccount?.type ?? "checking");
  const [balance, setBalance] = useState(editingAccount ? String(editingAccount.balance) : "0");

  const handleSave = () => {
    onSave({
      id: editingAccount?.id ?? crypto.randomUUID(),
      name: name.trim(),
      type,
      balance: Number(balance) || 0,
      color: editingAccount?.color ?? null,
      is_active: editingAccount?.is_active ?? true,
      annual_yield: editingAccount?.annual_yield ?? null,
      last_yield_date: editingAccount?.last_yield_date ?? null,
    });
  };

  const TypeIcon = typeConfig[type]?.icon ?? Building2;

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nubank" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v) => setType(v as Account["type"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(typeConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <cfg.icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Saldo atual (R$)</Label>
        <Input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0,00" />
      </div>
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/40">
        <TypeIcon className="h-5 w-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {type === "cash" ? "Dinheiro físico sem instituição" : `Conta ${typeConfig[type]?.label?.toLowerCase()}`}
        </span>
      </div>
      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim()}>{editingAccount ? "Salvar" : "Adicionar"}</Button>
      </DialogFooter>
    </div>
  );
}

export default function AccountsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { accounts, loading: accountsLoading, createAccount, updateAccount, deleteAccount } = useAccounts();
  const [showForm, setShowForm] = useState(false);
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const editingAccount = editingId ? accounts.find((a) => a.id === editingId) ?? null : null;

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalYield = accounts.reduce((s, a) => {
    if (!a.annual_yield || a.balance <= 0) return s;
    const monthlyYield = (a.balance * (a.annual_yield / 100) * 0.1375) / 12;
    return s + monthlyYield;
  }, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`${sidebarOpen ? "w-56" : "w-14"} border-r border-border/50 bg-background flex-col transition-all duration-200 hidden md:flex`}>
        <div className="h-14 flex items-center px-4 border-b border-border/50">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {sidebarOpen && <span>Finanças</span>}
          </button>
        </div>
        <nav className="flex-1 py-2 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(`/${item.id}`)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                item.id === "accounts" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-border/50 space-y-1">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
            {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {sidebarOpen && <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>}
          </button>
          <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col md:pt-0 min-h-screen">
        <MobileHeader
          icon={Wallet}
          title="Contas"
          description="Contas bancárias e dinheiro físico"
          onRefresh={() => {}}
          onPlus={() => setShowForm(true)}
          plusTitle="Nova conta"
        />

        <MobileBottomNav currentPath="/accounts" onQuickExpense={() => setShowQuickExpense(true)} />

        <main className="flex-1 overflow-auto pb-20 md:pb-6">
          <div className="w-full px-3 md:px-8 md:max-w-6xl md:mx-auto py-6 md:py-10">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="p-4 md:p-5 rounded-lg border border-border/60 bg-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider font-medium">Saldo total</p>
                  <Wallet className="h-3.5 w-3.5 text-muted-foreground/50" />
                </div>
                <p className="text-lg md:text-2xl font-light tracking-tight">R$ {formatCurrency(totalBalance)}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">{accounts.length} {accounts.length === 1 ? "conta" : "contas"}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="p-4 md:p-5 rounded-lg border border-border/60 bg-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider font-medium">Rendimentos/mês</p>
                  <TrendingUp className="h-3.5 w-3.5 text-green-600/60" />
                </div>
                <p className="text-lg md:text-2xl font-light tracking-tight text-green-700 dark:text-green-400">+R$ {formatCurrency(totalYield)}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Estimativa baseada no CDI</p>
              </motion.div>
            </div>

            {/* Account list */}
            <div className="space-y-3">
              {accounts.length === 0 ? (
                <div className="p-12 text-center rounded-lg border border-border/60 bg-card">
                  <Wallet className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowForm(true)}>Adicionar conta</Button>
                </div>
              ) : (
                accounts.map((acc, i) => {
                  const Icon = typeConfig[acc.type]?.icon ?? Building2;
                  return (
                    <motion.div
                      key={acc.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.05 * i }}
                      className="p-4 md:p-5 rounded-lg border border-border/60 bg-card"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="size-9 rounded-lg bg-muted/50 border border-border/40 flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{acc.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {typeConfig[acc.type]?.label}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-base font-light tracking-tight">R$ {formatCurrency(acc.balance)}</span>
                          <button onClick={() => { setEditingId(acc.id); setShowForm(true); }} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors" title="Editar">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeletingId(acc.id)} className="p-1.5 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title="Excluir">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingId(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar conta" : "Nova conta"}</DialogTitle>
            <DialogDescription>{editingId ? "Altere as informações da conta" : "Adicione uma conta bancária ou dinheiro físico"}</DialogDescription>
          </DialogHeader>
          <AccountForm
            editingAccount={editingAccount}
            onSave={async (acc) => {
              try {
                if (editingId) {
                  await updateAccount(editingId, acc);
                  toast("Conta atualizada");
                } else {
                  await createAccount(acc);
                  toast("Conta criada");
                }
                setShowForm(false);
                setEditingId(null);
              } catch (e: any) {
                toast.error("Erro ao salvar: " + e.message);
              }
            }}
            onCancel={() => { setShowForm(false); setEditingId(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>As transações associadas serão mantidas, mas a conta será removida permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
              if (deletingId) {
                try {
                  await deleteAccount(deletingId);
                  toast("Conta excluída");
                } catch (e: any) {
                  toast.error("Erro ao excluir: " + e.message);
                }
              }
              setDeletingId(null);
            }}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuickExpenseDialog open={showQuickExpense} onOpenChange={setShowQuickExpense} />
    </div>
  );
}
