export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: Record<string, string>;
}

export const themes: Theme[] = [
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Neon rosa + teal (padrão)",
    colors: {
      "--primary": "#ff00c8",
      "--primary-foreground": "#ffffff",
      "--accent": "#00ffcc",
      "--ring": "#ff00c8",
      "--chart-1": "#ff00c8",
      "--chart-2": "#9000ff",
      "--chart-3": "#00e5ff",
      "--chart-4": "#00ffcc",
      "--chart-5": "#ffe600",
      "--card": "#141414",
      "--sidebar": "#000000",
    },
  },
  {
    id: "neon",
    name: "Neon",
    description: "Roxo vibrante + ciano",
    colors: {
      "--primary": "#a855f7",
      "--primary-foreground": "#ffffff",
      "--accent": "#06b6d4",
      "--ring": "#a855f7",
      "--chart-1": "#a855f7",
      "--chart-2": "#06b6d4",
      "--chart-3": "#ec4899",
      "--chart-4": "#8b5cf6",
      "--chart-5": "#14b8a6",
      "--card": "#1a1025",
      "--sidebar": "#0f0a18",
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Verde esmeralda + índigo",
    colors: {
      "--primary": "#10b981",
      "--primary-foreground": "#ffffff",
      "--accent": "#6366f1",
      "--ring": "#10b981",
      "--chart-1": "#10b981",
      "--chart-2": "#6366f1",
      "--chart-3": "#22d3ee",
      "--chart-4": "#34d399",
      "--chart-5": "#818cf8",
      "--card": "#0a1a15",
      "--sidebar": "#061210",
    },
  },
  {
    id: "rose",
    name: "Rosé",
    description: "Rosa vibrante + laranja",
    colors: {
      "--primary": "#f43f5e",
      "--primary-foreground": "#ffffff",
      "--accent": "#fb923c",
      "--ring": "#f43f5e",
      "--chart-1": "#f43f5e",
      "--chart-2": "#fb923c",
      "--chart-3": "#fbbf24",
      "--chart-4": "#f87171",
      "--chart-5": "#fb7185",
      "--card": "#1a0f12",
      "--sidebar": "#120a0d",
    },
  },
  {
    id: "midnight",
    name: "Meia-Noite",
    description: "Azul royal + violeta",
    colors: {
      "--primary": "#3b82f6",
      "--primary-foreground": "#ffffff",
      "--accent": "#8b5cf6",
      "--ring": "#3b82f6",
      "--chart-1": "#3b82f6",
      "--chart-2": "#8b5cf6",
      "--chart-3": "#06b6d4",
      "--chart-4": "#60a5fa",
      "--chart-5": "#a78bfa",
      "--card": "#0f1525",
      "--sidebar": "#0a0f1a",
    },
  },
  {
    id: "gold",
    name: "Gold",
    description: "Dourado premium + vermelho",
    colors: {
      "--primary": "#f59e0b",
      "--primary-foreground": "#000000",
      "--accent": "#ef4444",
      "--ring": "#f59e0b",
      "--chart-1": "#f59e0b",
      "--chart-2": "#ef4444",
      "--chart-3": "#fbbf24",
      "--chart-4": "#f97316",
      "--chart-5": "#dc2626",
      "--card": "#1a1508",
      "--sidebar": "#121006",
    },
  },
];

export const THEME_KEY = "app-theme-id";

export function getSavedThemeId(): string {
  return localStorage.getItem(THEME_KEY) || "cyberpunk";
}

export function saveThemeId(id: string) {
  localStorage.setItem(THEME_KEY, id);
}

export function applyTheme(themeId: string) {
  const theme = themes.find((t) => t.id === themeId);
  if (!theme) return;
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
    root.style.setProperty(key.replace("--", "--color-"), value);
  });
}
