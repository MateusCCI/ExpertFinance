import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, Navigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useMissions } from "@/hooks/use-missions";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { QuickExpenseDialog } from "@/components/quick-expense-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Target,
  LogOut,
  LayoutDashboard,
  List,
  CreditCard,
  Landmark,
  Users,
  Settings,
  BarChart3,
  Wallet,
  Award,
  TrendingUp,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  ArrowRightLeft,
  FileText,
  ShoppingBag,
  Moon,
  Sun,
  Plus,
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
];


export default function MissionsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("missions");
  const [showQuickExpense, setShowQuickExpense] = useState(false);

  const { missions: bankMissions, progress: missionProgress, loading: missionsLoading, createMission, updateMission, deleteMission, updateProgress } = useMissions();

  // Mission dialog state
  type MissionItem = { id: string; name: string; description: string; trigger_type: string; trigger_target: number; current_count: number; is_completed: boolean; bonus_type: string; bonus_description: string; institution: string | null; icon: string | null };
  const [missionDialogOpen, setMissionDialogOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<MissionItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTriggerType, setFormTriggerType] = useState("boleto_count");
  const [formTriggerTarget, setFormTriggerTarget] = useState(3);
  const [formBonusType, setFormBonusType] = useState("yield_boost");
  const [formBonusDescription, setFormBonusDescription] = useState("");
  const [formInstitution, setFormInstitution] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  const openCreateDialog = useCallback(() => {
    setEditingMission(null);
    setFormName("");
    setFormDescription("");
    setFormTriggerType("boleto_count");
    setFormTriggerTarget(3);
    setFormBonusType("yield_boost");
    setFormBonusDescription("");
    setFormInstitution("");
    setMissionDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((mission: MissionItem) => {
    setEditingMission(mission);
    setFormName(mission.name);
    setFormDescription(mission.description);
    setFormTriggerType(mission.trigger_type);
    setFormTriggerTarget(mission.trigger_target);
    setFormBonusType(mission.bonus_type);
    setFormBonusDescription(mission.bonus_description);
    setFormInstitution(mission.institution ?? "");
    setMissionDialogOpen(true);
  }, []);

  const handleSaveMission = useCallback(async () => {
    if (!formName || !formDescription || !formBonusDescription) {
      toast("Preencha todos os campos obrigatórios");
      return;
    }
    setFormSaving(true);
    try {
      if (editingMission) {
        await updateMission(editingMission.id, {
          name: formName,
          description: formDescription,
          trigger_type: formTriggerType,
          trigger_target: formTriggerTarget,
          bonus_type: formBonusType,
          bonus_description: formBonusDescription,
          institution: formInstitution || null,
        });
        toast("Missão atualizada com sucesso");
      } else {
        await createMission({
          name: formName,
          description: formDescription,
          trigger_type: formTriggerType,
          trigger_target: formTriggerTarget,
          trigger_account_type: null,
          bonus_type: formBonusType,
          bonus_description: formBonusDescription,
          bonus_value: null,
          institution: formInstitution || null,
          is_active: true,
          icon: null,
        });
        toast("Missão criada com sucesso");
      }
      setMissionDialogOpen(false);
    } catch (err) {
      console.error("Failed to save mission:", err);
      toast("Erro ao salvar missão");
    }
    setFormSaving(false);
  }, [formName, formDescription, formTriggerType, formTriggerTarget, formBonusType, formBonusDescription, formInstitution, editingMission, createMission, updateMission]);

  const handleDeleteMission = useCallback(async (missionId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta missão?")) return;
    try {
      await deleteMission(missionId);
      toast("Missão excluída");
    } catch (err) {
      console.error("Failed to delete mission:", err);
      toast("Erro ao excluir missão");
    }
  }, [deleteMission]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

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

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const missions: MissionItem[] = bankMissions.map((m) => {
    const prog = missionProgress.find(
      (p) => p.mission_id === m.id && p.year === currentYear && p.month === currentMonth
    );
    return {
      id: m.id,
      name: m.name,
      description: m.description,
      trigger_type: m.trigger_type,
      trigger_target: m.trigger_target,
      current_count: prog?.current_count ?? 0,
      is_completed: prog?.is_completed ?? false,
      bonus_type: m.bonus_type,
      bonus_description: m.bonus_description,
      institution: m.institution,
      icon: m.icon,
    };
  });
  const completedCount = missions.filter((m) => m.is_completed).length;
  const totalMissions = missions.length;
  const overallProgress = totalMissions > 0 ? (completedCount / totalMissions) * 100 : 0;
  const loadingData = missionsLoading;

  function getMissionIcon(type: string, completed: boolean) {
    switch (type) {
      case "boleto_count":
        return <FileText className={`h-4 w-4 ${completed ? "text-green-600" : "text-muted-foreground"}`} />;
      case "pix_sent_count":
        return <ArrowRightLeft className={`h-4 w-4 ${completed ? "text-green-600" : "text-muted-foreground"}`} />;
      case "min_balance":
        return <Wallet className={`h-4 w-4 ${completed ? "text-green-600" : "text-muted-foreground"}`} />;
      case "card_purchases":
        return <ShoppingBag className={`h-4 w-4 ${completed ? "text-green-600" : "text-muted-foreground"}`} />;
      case "invoice_payments":
        return <CreditCard className={`h-4 w-4 ${completed ? "text-green-600" : "text-muted-foreground"}`} />;
      default:
        return <Award className={`h-4 w-4 ${completed ? "text-green-600" : "text-muted-foreground"}`} />;
    }
  }

  function getBonusBadge(type: string) {
    switch (type) {
      case "yield_boost":
        return { label: "CDI Boost", variant: "secondary" as const };
      case "cashback_boost":
        return { label: "Cashback+", variant: "outline" as const };
      case "fee_waiver":
        return { label: "Isenção", variant: "secondary" as const };
      default:
        return { label: "Bônus", variant: "outline" as const };
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
                item.id === "missions"
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
        icon={Target}
        title="Missões"
        description="Metas e recompensas financeiras"
        onRefresh={() => toast("Progresso recalculado", { description: "Missões atualizadas" })}
        onPlus={openCreateDialog}
        plusTitle="Nova missão"
      />

      <MobileBottomNav currentPath="/missions" onQuickExpense={() => setShowQuickExpense(true)} />

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-6">
        <div className="w-full px-3 md:px-8 md:max-w-6xl md:mx-auto py-6 md:py-10">
          {/* Overall progress */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="p-5 rounded-lg border border-border/60 bg-card mb-6"
          >
            {loadingData ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-foreground/70" />
                    <h3 className="text-sm font-medium text-foreground">Progresso do Mês</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {completedCount}/{totalMissions} missões
                  </Badge>
                </div>
                <Progress value={overallProgress} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {totalMissions === 0
                    ? "Nenhuma missão configurada ainda. Crie sua primeira missão!"
                    : completedCount === totalMissions
                      ? "🎉 Todas as missões concluídas! Bônus de rendimento ativos."
                      : `${totalMissions - completedCount} missão(ões) restante(s) para maximizar seus rendimentos.`}
                </p>
              </>
            )}
          </motion.div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="missions" className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Missões
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" />
                Remanejamento
              </TabsTrigger>
            </TabsList>

            {/* Missions tab */}
            <TabsContent value="missions">
              {loadingData ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                </div>
              ) : missions.length === 0 ? (
                <div className="p-12 text-center rounded-lg border border-border/60 bg-card">
                  <Target className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">Nenhuma missão encontrada.</p>
                  <Button size="sm" onClick={openCreateDialog}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Criar primeira missão
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {missions.map((mission, i) => {
                    const bonus = getBonusBadge(mission.bonus_type);
                    const progressPercent =
                      mission.trigger_type === "min_balance"
                        ? Math.min((mission.current_count / mission.trigger_target) * 100, 100)
                        : (mission.current_count / mission.trigger_target) * 100;
                    const displayCount =
                      mission.trigger_type === "min_balance"
                        ? `R$ ${formatCurrency(mission.current_count)} / R$ ${formatCurrency(mission.trigger_target)}`
                        : `${mission.current_count} / ${mission.trigger_target}`;

                    return (
                      <motion.div
                        key={mission.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 * i }}
                        className={`p-5 rounded-lg border bg-card transition-colors group ${
                          mission.is_completed
                            ? "border-green-200 dark:border-green-800"
                            : "border-border/60"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                mission.is_completed
                                  ? "bg-green-50 dark:bg-green-950/30"
                                  : "bg-secondary"
                              }`}
                            >
                              {getMissionIcon(mission.trigger_type, mission.is_completed)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium text-foreground">
                                  {mission.name}
                                </h3>
                                <Badge variant={bonus.variant} className="text-[10px]">
                                  {bonus.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {mission.description}
                              </p>
                              {mission.institution && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {mission.institution}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEditDialog(mission)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 opacity-0 group-hover:opacity-100 transition-all"
                              title="Editar missão"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMission(mission.id)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all"
                              title="Excluir missão"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            {mission.is_completed && (
                              <CheckCircle2 className="h-5 w-5 text-green-600 ml-1" />
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className={`tabular-nums font-medium ${
                              mission.is_completed ? "text-green-600 dark:text-green-400" : "text-foreground"
                            }`}>
                              {displayCount}
                            </span>
                          </div>
                          <Progress
                            value={progressPercent}
                            className={`h-2 ${
                              mission.is_completed
                                ? "bg-green-100 dark:bg-green-950/30 [&>div]:bg-green-500"
                                : progressPercent > 80
                                  ? "bg-amber-100 dark:bg-amber-950/30"
                                  : ""
                            }`}
                          />
                        </div>

                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                          <Sparkles className={`h-3.5 w-3.5 ${
                            mission.is_completed ? "text-green-600" : "text-amber-500"
                          }`} />
                          <span className={`text-xs ${
                            mission.is_completed
                              ? "text-green-600 dark:text-green-400"
                              : "text-muted-foreground"
                          }`}>
                            {mission.is_completed
                              ? `🎉 Bônus ativo: ${mission.bonus_description}`
                              : `Prêmio: ${mission.bonus_description}`}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Suggestions tab */}
            <TabsContent value="suggestions">
              <div className="p-10 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-600 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum remanejamento disponível no momento.
                </p>
              </div>
            </TabsContent>
          </Tabs>


        </div>
      </main>

      </div>

      {/* Quick expense dialog */}
      <QuickExpenseDialog open={showQuickExpense} onOpenChange={setShowQuickExpense} />

      {/* Mission create/edit dialog */}
      <Dialog open={missionDialogOpen} onOpenChange={setMissionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMission ? "Editar Missão" : "Nova Missão"}</DialogTitle>
            <DialogDescription>
              {editingMission
                ? "Altere os campos da missão."
                : "Defina uma nova missão bancária para rastrear."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da missão</Label>
              <input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Mestre dos Boletos"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ex: Pague 3 boletos no mês para destravar 130% do CDI"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="triggerType">Tipo de gatilho</Label>
              <Select value={formTriggerType} onValueChange={setFormTriggerType}>
                <SelectTrigger id="triggerType">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto_count">Boletos pagos</SelectItem>
                  <SelectItem value="pix_sent_count">PIX enviados</SelectItem>
                  <SelectItem value="pix_received_count">PIX recebidos</SelectItem>
                  <SelectItem value="card_purchases">Compras no cartão</SelectItem>
                  <SelectItem value="invoice_payments">Faturas pagas</SelectItem>
                  <SelectItem value="min_balance">Saldo mínimo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="triggerTarget">Meta ({formTriggerType === "min_balance" ? "R$" : "quantidade"})</Label>
              <input
                id="triggerTarget"
                type="number"
                value={formTriggerTarget}
                onChange={(e) => setFormTriggerTarget(Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonusType">Tipo de bônus</Label>
              <Select value={formBonusType} onValueChange={setFormBonusType}>
                <SelectTrigger id="bonusType">
                  <SelectValue placeholder="Selecione o bônus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yield_boost">CDI Boost</SelectItem>
                  <SelectItem value="cashback_boost">Cashback+</SelectItem>
                  <SelectItem value="fee_waiver">Isenção de tarifa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonusDescription">Descrição do bônus</Label>
              <input
                id="bonusDescription"
                value={formBonusDescription}
                onChange={(e) => setFormBonusDescription(e.target.value)}
                placeholder="Ex: 130% do CDI por 30 dias"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution">Instituição (opcional)</Label>
              <input
                id="institution"
                value={formInstitution}
                onChange={(e) => setFormInstitution(e.target.value)}
                placeholder="Ex: Nubank, Itaú"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMissionDialogOpen(false)} disabled={formSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveMission} disabled={formSaving}>
              {formSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                  Salvando...
                </>
              ) : editingMission ? (
                "Salvar alterações"
              ) : (
                "Criar missão"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
