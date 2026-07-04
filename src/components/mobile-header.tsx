import type { LucideIcon } from "lucide-react"
import { Plus, Sun, Moon, Cloud, CloudRain, CloudOff, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { getPendingCount, flushQueue } from "@/lib/sync-manager"
import { useState, useEffect } from "react"

interface MobileHeaderProps {
  icon: LucideIcon
  title: string
  description: string
  onRefresh?: () => void
  onPlus?: () => void
  plusTitle?: string
  children?: React.ReactNode
}

export function MobileHeader({
  icon: Icon,
  title,
  description,
  onRefresh,
  onPlus,
  plusTitle,
  children,
}: MobileHeaderProps) {
  const { theme, setTheme } = useTheme()
  const { isOnline, wasOffline } = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setPendingCount(getPendingCount())
  }, [])

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncing) {
      setSyncing(true)
      flushQueue().then((synced) => {
        setPendingCount(getPendingCount())
        setSyncing(false)
      }).catch(() => setSyncing(false))
    }
  }, [isOnline, pendingCount, syncing])

  const syncStatus = syncing ? "syncing" : !isOnline ? "offline" : pendingCount > 0 ? "pending" : "synced"

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden sticky top-0 z-40 h-12 bg-background/95 backdrop-blur-sm border-b border-border/50 flex items-center justify-between px-3">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h1 className="text-sm font-medium text-foreground truncate leading-tight">{title}</h1>
            <p className="text-[10px] text-muted-foreground truncate leading-tight">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {!isOnline && (
            <span className="text-[9px] text-amber-500 font-medium px-1.5 py-0.5 rounded bg-amber-500/10 mr-1">
              Offline
            </span>
          )}
          {wasOffline && isOnline && (
            <span className="text-[9px] text-green-500 font-medium px-1.5 py-0.5 rounded bg-green-500/10 mr-1 animate-pulse">
              Sync...
            </span>
          )}
          {onPlus && (
            <Button size="icon-sm" title={plusTitle ?? "Adicionar"} onClick={onPlus}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            title={syncStatus === "synced" ? "Sincronizado" : syncStatus === "syncing" ? "Sincronizando..." : syncStatus === "offline" ? "Sem conexão" : `${pendingCount} pendente(s)`}
            className={`p-1.5 rounded-md transition-colors ${
              syncStatus === "synced"
                ? "text-green-500"
                : syncStatus === "syncing"
                  ? "text-blue-500 animate-pulse"
                  : syncStatus === "offline"
                    ? "text-amber-500"
                    : "text-muted-foreground/70"
            }`}
          >
            {syncStatus === "syncing" ? <CloudRain className="h-4 w-4" /> : syncStatus === "offline" ? <WifiOff className="h-4 w-4" /> : syncStatus === "synced" ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
          </button>
          {children}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <h1 className="text-xl font-medium tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="text-[10px] text-amber-500 font-medium px-2 py-1 rounded-md bg-amber-500/10 flex items-center gap-1">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          )}
          {wasOffline && isOnline && (
            <span className="text-[10px] text-green-500 font-medium px-2 py-1 rounded-md bg-green-500/10 flex items-center gap-1 animate-pulse">
              <Wifi className="h-3 w-3" /> Sincronizando...
            </span>
          )}
          {onPlus && (
            <Button size="sm" className="text-xs h-9" onClick={onPlus}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {plusTitle ?? "Adicionar"}
            </Button>
          )}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {children}
        </div>
      </div>
    </>
  )
}
