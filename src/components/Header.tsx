import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useBridgeStatus } from "@/hooks/useBridgeStatus";
import { LayoutDashboard, ScrollText, BarChart3, Map, Settings, LogOut, CalendarClock, UserCircle, Bot } from "lucide-react";

interface HeaderProps {
  runningCount: number;
  isConnected?: boolean;
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
    <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-md">
      {/* Top gradient line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="flex h-12 md:h-14 items-center justify-between px-3 md:px-6">
        <div className="flex items-center gap-3 md:gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/icon-192.png" alt="Mission Control" className="h-7 w-7 rounded-md" />
            <h1 className="hidden md:block font-mono text-sm font-bold tracking-widest text-foreground">
              MISSION CONTROL
            </h1>
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
            <Badge className="bg-primary/15 text-primary border-primary/25 text-[10px] md:text-[11px] font-mono gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              {runningCount} rodando
            </Badge>
          )}

          {/* Bridge status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-default">
                <Bot className={`h-3.5 w-3.5 ${bridge.isOnline ? "text-success" : "text-muted-foreground"}`} />
                <div className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${bridge.isOnline ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
                  <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:inline font-mono">
                    {bridge.isOnline ? "Bridge ON" : "Bridge OFF"}
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs space-y-1 font-mono">
              {bridge.isOnline ? (
                <>
                  <p className="font-semibold text-success">● Agent Bridge online</p>
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
                <p className="text-[10px] text-muted-foreground uppercase font-mono">{role ?? "—"}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" onClick={signOut} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom border */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </header>
  );
}
