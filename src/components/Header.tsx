import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useBridgeStatus } from "@/hooks/useBridgeStatus";
import { Zap, LayoutDashboard, ScrollText, BarChart3, Map, Settings, LogOut, CalendarClock, UserCircle, Bot } from "lucide-react";

interface HeaderProps {
  runningCount: number;
  isConnected?: boolean; // mantido para compatibilidade, não usado mais
}

function formatAgo(seconds: number): string {
  if (seconds < 60) return `${seconds}s atrás`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
  return `${Math.floor(seconds / 3600)}h atrás`;
}

export function Header({ runningCount }: HeaderProps) {
  const [time, setTime] = useState(new Date());
  const { user, profile, role, signOut } = useAuth();
  const bridge = useBridgeStatus();

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="flex h-12 md:h-14 items-center justify-between px-3 md:px-6">
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h1 className="hidden md:block text-lg font-bold tracking-tight">MISSION CONTROL</h1>
          </div>
          <nav className="flex items-center gap-0.5 md:gap-1">
            <NavLink to="/" icon={<LayoutDashboard className="h-4 w-4" />}>Dashboard</NavLink>
            <NavLink to="/logs" icon={<ScrollText className="h-4 w-4" />}>Logs</NavLink>
            <NavLink to="/analytics" icon={<BarChart3 className="h-4 w-4" />}>Analytics</NavLink>
            <NavLink to="/roadmap" icon={<Map className="h-4 w-4" />}>Roadmap</NavLink>
            <NavLink to="/scheduler" icon={<CalendarClock className="h-4 w-4" />}>Agenda</NavLink>
            {role === "admin" && (
              <NavLink to="/settings" icon={<Settings className="h-4 w-4" />}>Config</NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {runningCount > 0 && (
            <Badge className="bg-primary/20 text-primary border-primary/30 animate-pulse text-[10px] md:text-xs">
              {runningCount} rodando
            </Badge>
          )}

          {/* Bridge status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-default">
                <Bot className={`h-3.5 w-3.5 ${bridge.isOnline ? "text-green-400" : "text-muted-foreground"}`} />
                <div className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${bridge.isOnline ? "bg-green-400 animate-pulse" : "bg-muted-foreground"}`} />
                  <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:inline">
                    {bridge.isOnline ? "Bridge ON" : "Bridge OFF"}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs space-y-1">
              {bridge.isOnline ? (
                <>
                  <p className="font-semibold text-green-400">● Agent Bridge online</p>
                  {bridge.host && <p>Host: <span className="font-mono">{bridge.host}</span></p>}
                  {bridge.secondsAgo !== null && <p>Último sinal: {formatAgo(bridge.secondsAgo)}</p>}
                </>
              ) : (
                <>
                  <p className="font-semibold text-destructive">● Agent Bridge offline</p>
                  {bridge.lastSeen ? (
                    <p>Último sinal: {formatAgo(bridge.secondsAgo!)}</p>
                  ) : (
                    <p>Nenhum sinal recebido ainda.</p>
                  )}
                  <p className="text-muted-foreground">Rode: python3 ~/missioncontrol/agent_bridge.py</p>
                </>
              )}
            </TooltipContent>
          </Tooltip>

          <span className="hidden md:inline font-mono text-xs text-muted-foreground tabular-nums">
            {time.toLocaleTimeString("pt-BR")}
          </span>

          {user && (
            <div className="flex items-center gap-2 border-l border-border pl-2 md:pl-4">
              {profile ? (
                <span className="text-sm">{profile.avatar_emoji}</span>
              ) : (
                <UserCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="hidden sm:block">
                <p className="text-xs font-medium leading-tight">
                  {profile?.name ?? user.email?.split("@")[0] ?? "Usuário"}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">{role ?? "—"}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
