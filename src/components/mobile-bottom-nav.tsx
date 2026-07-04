import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard,
  CreditCard,
  Landmark,
  Wallet,
  Plus,
  List,
  Target,
  BarChart3,
  Settings,
  Users,
  Menu,
  X,
  Pencil,
  GripVertical,
} from "lucide-react";

const defaultNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Transações", icon: List, path: "/transactions" },
  { label: "Cartões", icon: CreditCard, path: "/cards" },
  { label: "Contas", icon: Wallet, path: "/accounts" },
  { label: "Aluguel", icon: Landmark, path: "/rent" },
];

const defaultExtraItems = [
  { label: "Terceiros", icon: Users, path: "/ledger" },
  { label: "Missões", icon: Target, path: "/missions" },
  { label: "Relatórios", icon: BarChart3, path: "/reports" },
  { label: "Configurações", icon: Settings, path: "/settings" },
];

const NAV_KEY = "bottomnav-order";

function loadOrder() {
  try {
    const stored = JSON.parse(localStorage.getItem(NAV_KEY) || "null");
    if (stored && Array.isArray(stored) && stored.length === 5) return stored;
  } catch {}
  return defaultNavItems.map((i) => i.path);
}

function loadExtraOrder() {
  try {
    const stored = JSON.parse(localStorage.getItem(NAV_KEY + "-extra") || "null");
    if (stored && Array.isArray(stored) && stored.length === 4) return stored;
  } catch {}
  return defaultExtraItems.map((i) => i.path);
}

const allItems = [...defaultNavItems, ...defaultExtraItems];

interface MobileBottomNavProps {
  currentPath: string;
  onQuickExpense: () => void;
}

export function MobileBottomNav({ currentPath, onQuickExpense }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [navOrder, setNavOrder] = useState<string[]>(loadOrder);
  const [extraOrder, setExtraOrder] = useState<string[]>(loadExtraOrder);

  useEffect(() => {
    localStorage.setItem(NAV_KEY, JSON.stringify(navOrder));
  }, [navOrder]);

  useEffect(() => {
    localStorage.setItem(NAV_KEY + "-extra", JSON.stringify(extraOrder));
  }, [extraOrder]);

  const navItems = navOrder.map((p) => allItems.find((i) => i.path === p)!).filter(Boolean);
  const extraItems = extraOrder.map((p) => allItems.find((i) => i.path === p)!).filter(Boolean);

  const moveItem = (fromList: "nav" | "extra", fromIdx: number, direction: "up" | "down") => {
    const list = fromList === "nav" ? [...navOrder] : [...extraOrder];
    const toIdx = direction === "up" ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= list.length) return;
    [list[fromIdx], list[toIdx]] = [list[toIdx], list[fromIdx]];
    if (fromList === "nav") setNavOrder(list);
    else setExtraOrder(list);
  };

  return (
    <>
      {/* Floating extra menu */}
      {menuOpen && !editing && (
        <div className="md:hidden fixed bottom-20 right-3 z-50 bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
          <button
            onClick={() => { setMenuOpen(false); setEditing(true); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors border-b border-border/30"
          >
            <Pencil className="h-4 w-4" />
            <span>Editar barra</span>
          </button>
          {extraItems.map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMenuOpen(false); }}
              className={`flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors ${currentPath === item.path ? "text-foreground bg-secondary/50" : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"}`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Edit mode panel */}
      {editing && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border/50 p-3 max-h-[60vh] overflow-y-auto">
          <p className="text-[10px] text-muted-foreground mb-2">Barra principal (5 itens)</p>
          <div className="space-y-1 mb-4">
            {navOrder.map((path, idx) => {
              const item = allItems.find((i) => i.path === path);
              if (!item) return null;
              return (
                <div key={path} className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/40">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs flex-1">{item.label}</span>
                  <button onClick={() => moveItem("nav", idx, "up")} disabled={idx === 0} className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 px-1">↑</button>
                  <button onClick={() => moveItem("nav", idx, "down")} disabled={idx === navOrder.length - 1} className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 px-1">↓</button>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground mb-2">Menu "Mais" (4 itens)</p>
          <div className="space-y-1">
            {extraOrder.map((path, idx) => {
              const item = allItems.find((i) => i.path === path);
              if (!item) return null;
              return (
                <div key={path} className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/40">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs flex-1">{item.label}</span>
                  <button onClick={() => moveItem("extra", idx, "up")} disabled={idx === 0} className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 px-1">↑</button>
                  <button onClick={() => moveItem("extra", idx, "down")} disabled={idx === extraOrder.length - 1} className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 px-1">↓</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-sm border-t border-border/50 z-50 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {!editing ? (
          <>
            {navItems.slice(0, 3).map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-md transition-colors min-w-0 ${currentPath === item.path ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[9px] font-medium truncate">{item.label}</span>
              </button>
            ))}

            <button
              onClick={onQuickExpense}
              className="relative -mt-5 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-transform active:scale-90 hover:scale-105 shadow-lg shadow-primary/20"
            >
              <Plus className="h-6 w-6" />
            </button>

            {navItems.slice(3, 5).map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-md transition-colors min-w-0 ${currentPath === item.path ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[9px] font-medium truncate">{item.label}</span>
              </button>
            ))}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-md transition-colors min-w-0 ${menuOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="text-[9px] font-medium truncate">Mais</span>
            </button>
          </>
        ) : (
          <>
            <div className="flex-1" />
            <button
              onClick={onQuickExpense}
              className="relative -mt-5 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-transform active:scale-90 hover:scale-105 shadow-lg shadow-primary/20"
            >
              <Plus className="h-6 w-6" />
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setEditing(false)}
              className="flex flex-col items-center gap-0.5 py-1 px-1.5 rounded-md transition-colors min-w-0 text-foreground"
            >
              <X className="h-5 w-5" />
              <span className="text-[9px] font-medium truncate">Fechar</span>
            </button>
          </>
        )}
      </nav>
    </>
  );
}
