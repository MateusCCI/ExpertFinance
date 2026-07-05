import { useState, useMemo } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { toast } from "sonner";
import { QuickExpenseDialog } from "@/components/quick-expense-dialog";
import { useCategories, Category } from "@/hooks/use-categories";
import { useTheme } from "next-themes";
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  Search,
  LayoutDashboard,
  List,
  CreditCard,
  Wallet,
  Landmark,
  Users,
  Target,
  BarChart3,
  Settings,
  LogOut,
  Repeat,
  PieChart,
  Sun,
  Moon,
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

const presetColors = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
];

const presetIcons = [
  "🛒", "🍔", "🚗", "🏠", "💊", "🎮", "📱", "📚",
  "✈️", "🎬", "☕", "🏋️", "🐕", "👶", "💡", "🔧",
  "💰", "📈", "🎁", "🛒", "💳", "🏦", "🎵", "🏥",
];

function CategoryForm({
  onSave,
  onCancel,
  editing,
}: {
  onSave: (data: { name: string; icon: string | null; color: string | null; is_default: boolean; parent_id: string | null }) => void;
  onCancel: () => void;
  editing?: Category | null;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [icon, setIcon] = useState(editing?.icon ?? "🛒");
  const [color, setColor] = useState(editing?.color ?? "#3b82f6");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      icon,
      color,
      is_default: editing?.is_default ?? false,
      parent_id: editing?.parent_id ?? null,
    });
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Alimentação" autoFocus />
      </div>

      <div className="space-y-1.5">
        <Label>Ícone</Label>
        <div className="flex flex-wrap gap-1.5">
          {presetIcons.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              className={`w-8 h-8 rounded-md text-lg flex items-center justify-center transition-all ${
                icon === emoji ? "bg-primary text-primary-foreground scale-110" : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-1.5">
          {presetColors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition-all ${
                color === c ? "border-foreground scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
          {editing ? "Salvar" : "Criar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, id: "dashboard" },
  { label: "Transações", icon: List, id: "transactions" },
  { label: "Cartões", icon: CreditCard, id: "cards" },
  { label: "Contas", icon: Wallet, id: "accounts" },
  { label: "Aluguel", icon: Landmark, id: "rent" },
  { label: "Terceiros", icon: Users, id: "ledger" },
  { label: "Assinaturas", icon: Repeat, id: "subscriptions" },
  { label: "Categorias", icon: PieChart, id: "budgets" },
  { label: "Missões", icon: Target, id: "missions" },
  { label: "Relatórios", icon: BarChart3, id: "reports" },
  { label: "Configurações", icon: Settings, id: "settings" },
];

export default function BudgetCategories() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { categories, loading: categoriesLoading, createCategory, updateCategory, deleteCategory } = useCategories();

  const editing = editingId ? categories.find((c) => c.id === editingId) ?? null : null;

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const parentCategories = useMemo(() => filtered.filter((c) => !c.parent_id), [filtered]);
  const childMap = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of filtered) {
      if (c.parent_id) {
        const list = map.get(c.parent_id) || [];
        list.push(c);
        map.set(c.parent_id, list);
      }
    }
    return map;
  }, [filtered]);

  if (authLoading || categoriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async (data: { name: string; icon: string | null; color: string | null; is_default: boolean; parent_id: string | null }) => {
    try {
      if (editingId) {
        await updateCategory(editingId, data);
        toast("Categoria atualizada", { description: data.name });
        setEditingId(null);
      } else {
        await createCategory(data);
        toast("Categoria criada", { description: data.name });
        setShowNew(false);
      }
    } catch {
      toast.error("Erro ao salvar categoria");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const cat = categories.find((c) => c.id === deletingId);
      await deleteCategory(deletingId);
      toast("Categoria excluída", { description: cat?.name });
    } catch {
      toast.error("Erro ao excluir categoria");
    }
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — desktop only */}
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
            <PieChart className="h-4 w-4" />
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
                if (item.id === "accounts") navigate("/accounts");
                if (item.id === "rent") navigate("/rent");
                if (item.id === "ledger") navigate("/ledger");
                if (item.id === "subscriptions") navigate("/subscriptions");
                if (item.id === "missions") navigate("/missions");
                if (item.id === "reports") navigate("/reports");
                if (item.id === "settings") navigate("/settings");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                item.id === "budgets"
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
          icon={Tag}
          title="Categorias"
          description="Gerencie suas categorias de transação"
          onPlus={() => setShowNew(true)}
          plusTitle="Nova categoria"
        />

        <MobileBottomNav currentPath="/budgets" onQuickExpense={() => setShowQuickExpense(true)} />

        <main className="flex-1 pb-20 md:pb-6">
          <div className="max-w-2xl mx-auto px-4 py-6">

            {/* Busca */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar categoria..."
                className="pl-9"
              />
            </div>

            {/* Resumo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-lg border border-border/60 bg-card p-3 flex-1">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-semibold">{categories.length}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3 flex-1">
                <p className="text-xs text-muted-foreground">Subcategorias</p>
                <p className="text-lg font-semibold">{categories.filter((c) => c.parent_id).length}</p>
              </div>
            </div>

            {/* Lista */}
            {parentCategories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{search ? "Nenhuma categoria encontrada" : "Nenhuma categoria cadastrada"}</p>
                <p className="text-xs mt-1">Crie categorias para organizar suas transações</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parentCategories.map((cat) => {
                  const children = childMap.get(cat.id) || [];
                  return (
                    <div key={cat.id}>
                      {/* Categoria pai */}
                      <div className="rounded-lg border border-border/60 bg-card p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
                              style={{ backgroundColor: cat.color ? `${cat.color}20` : undefined }}
                            >
                              {cat.icon ?? "📁"}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-medium text-foreground truncate">{cat.name}</h3>
                              {children.length > 0 && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {children.length} subcategoria(s)
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {cat.is_default && (
                              <Badge variant="secondary" className="text-[10px] shrink-0">Padrão</Badge>
                            )}
                            <button
                              onClick={() => setEditingId(cat.id)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(cat.id)}
                              className="p-1.5 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Subcategorias */}
                      {children.map((child) => (
                        <div key={child.id} className="rounded-lg border border-border/60 bg-card p-3 ml-6 mt-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-7 h-7 rounded-md flex items-center justify-center text-sm shrink-0"
                                style={{ backgroundColor: child.color ? `${child.color}20` : undefined }}
                              >
                                {child.icon ?? "📁"}
                              </div>
                              <span className="text-xs text-foreground truncate">{child.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingId(child.id)}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setDeletingId(child.id)}
                                className="p-1 rounded-md text-muted-foreground/50 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <QuickExpenseDialog open={showQuickExpense} onOpenChange={setShowQuickExpense} />

      {/* Dialog: nova / editar */}
      <Dialog open={showNew || editingId !== null} onOpenChange={(open) => { if (!open) { setShowNew(false); setEditingId(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
            <DialogDescription>{editing ? "Altere os dados da categoria" : "Crie uma nova categoria"}</DialogDescription>
          </DialogHeader>
          <CategoryForm
            editing={editing}
            onSave={handleSave}
            onCancel={() => { setShowNew(false); setEditingId(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* AlertDialog: excluir */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <ADContent>
          <ADHeader>
            <ADTitle>Excluir categoria?</ADTitle>
            <ADDescription>Transações usando esta categoria não serão excluídas.</ADDescription>
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
