import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { Navigate } from "react-router";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { QuickExpenseDialog } from "@/components/quick-expense-dialog";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getSavedThemeId, saveThemeId, applyTheme } from "@/lib/themes";
import {
  Settings,
  LogOut,
  LayoutDashboard,
  List,
  CreditCard,
  Landmark,
  Target,
  Users,
  BarChart3,
  Wallet,
  Moon,
  Sun,
  Bell,
  Shield,
  Palette,
  Smartphone,
  Database,
  Info,
  User,
  Plus,
  RefreshCw,
  Mail,
  Loader2,
  Save,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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


export default function SettingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signOut, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [offlineMode, setOfflineMode] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    applyTheme(getSavedThemeId());
  }, []);

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === user?.email) {
      toast.error("Digite um email diferente do atual");
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;

      toast.success("Email de confirmação enviado!", {
        description: `Um link de confirmação foi enviado para ${newEmail}`,
      });
      setNewEmail("");
    } catch (error: any) {
      toast.error("Erro ao atualizar email", {
        description: error?.message || "Tente novamente",
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

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

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const isDark = theme === "dark";

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
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                item.id === "settings"
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
          icon={Settings}
          title="Configurações"
          description="Preferências e configurações do app"
          onRefresh={() => {}}
          onPlus={() => setShowQuickExpense(true)}
          plusTitle="Nova transação"
        />

        <MobileBottomNav currentPath="/settings" onQuickExpense={() => setShowQuickExpense(true)} />

        {/* Main content */}
        <main className="flex-1 md:pt-0 pt-14 overflow-auto pb-20 md:pb-6">
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-10">
          {/* Theme Section */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="rounded-lg border border-border/60 bg-card overflow-hidden mb-4"
          >
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Aparência</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  {isDark ? (
                    <Moon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <Sun className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">Tema {isDark ? "Escuro" : "Claro"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isDark
                        ? "Fundo escuro com cores vibrantes"
                        : "Fundo claro com contraste suave"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                >
                  {isDark ? (
                    <><Sun className="h-3.5 w-3.5 mr-1.5" /> Claro</>
                  ) : (
                    <><Moon className="h-3.5 w-3.5 mr-1.5" /> Escuro</>
                  )}
                </Button>
              </div>
              {isDark && (
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">Cor do tema</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Escolha entre 5 paletas de cores</p>
                  </div>
                  <ThemeSwitcher onThemeChange={(t) => {
                    applyTheme(t.id);
                    saveThemeId(t.id);
                    toast("Tema alterado", { description: t.name });
                  }} />
                </div>
              )}
            </div>
          </motion.div>

          {/* Notifications Section */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-lg border border-border/60 bg-card overflow-hidden mb-4"
          >
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Notificações</h3>
            </div>
            <div className="divide-y divide-border/30">
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Notificações push</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Alertas de vencimentos e picos de gasto</p>
                </div>
                <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
              </div>
            </div>
          </motion.div>

          {/* Sync Section */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-lg border border-border/60 bg-card overflow-hidden mb-4"
          >
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Sincronização</h3>
            </div>
            <div className="divide-y divide-border/30">
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Modo offline</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Permite usar o app sem internet</p>
                </div>
                <Switch checked={offlineMode} onCheckedChange={setOfflineMode} />
              </div>
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Sincronização automática</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Envia dados pendentes quando online</p>
                </div>
                <Switch checked={autoSync} onCheckedChange={setAutoSync} />
              </div>
            </div>
          </motion.div>

          {/* Account Section */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-lg border border-border/60 bg-card overflow-hidden mb-4"
          >
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Conta</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Email atual</p>
                </div>
                <p className="text-sm font-medium text-foreground pl-6">{user?.email}</p>
              </div>
              <div className="space-y-2 pt-2 border-t border-border/30">
                <label className="text-sm text-muted-foreground">Novo email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="novo@email.com"
                    className="flex-1 h-8 rounded-md border border-border/60 bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={handleUpdateEmail}
                    disabled={isUpdatingEmail || !newEmail}
                  >
                    {isUpdatingEmail ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        Salvar
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Um email de confirmação será enviado para o novo endereço
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 w-full"
                onClick={() => signOut()}
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Sair da conta
              </Button>
            </div>
          </motion.div>

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="rounded-lg border border-border/60 bg-card overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Sobre</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Versão</span>
                <span className="text-foreground font-medium">1.0.0</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Framework</span>
                <span className="text-foreground font-medium">React + Supabase + Vite</span>
              </div>
              <div className="pt-3 border-t border-border/30">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Minhas Finanças — Sistema de controle financeiro pessoal inteligente.
                  Construído com foco em simplicidade, offline-first e gamificação.
                </p>
              </div>
            </div>
          </motion.div>
          </div>
        </main>
      </div>

      {/* Quick expense dialog */}
      <QuickExpenseDialog open={showQuickExpense} onOpenChange={setShowQuickExpense} />
    </div>
  );
}
