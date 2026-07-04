import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { themes, getSavedThemeId, saveThemeId, type Theme } from "@/lib/themes";

interface ThemeSwitcherProps {
  onThemeChange: (theme: Theme) => void;
}

export function ThemeSwitcher({ onThemeChange }: ThemeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(getSavedThemeId());

  const handleSelect = (theme: Theme) => {
    setSelectedId(theme.id);
    saveThemeId(theme.id);
    onThemeChange(theme);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-card hover:bg-secondary/50 transition-colors text-sm"
      >
        <Palette className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Tema</span>
        <div
          className="w-4 h-4 rounded-full border-2 border-border"
          style={{ backgroundColor: themes.find((t) => t.id === selectedId)?.primary }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-64 bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-3 border-b border-border/30">
              <p className="text-xs font-medium text-foreground">Escolher tema</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Personalize as cores do app</p>
            </div>
            <div className="p-2">
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleSelect(theme)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    selectedId === theme.id
                      ? "bg-secondary"
                      : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex gap-1">
                    <div
                      className="w-5 h-5 rounded-full border border-border/40"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <div
                      className="w-5 h-5 rounded-full border border-border/40"
                      style={{ backgroundColor: theme.accent }}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-medium text-foreground">{theme.name}</p>
                    <p className="text-[10px] text-muted-foreground">{theme.description}</p>
                  </div>
                  {selectedId === theme.id && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
