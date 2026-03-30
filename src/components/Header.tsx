import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, LayoutDashboard, ScrollText, BarChart3, Map, Settings, LogOut, CalendarClock } from "lucide-react";

interface HeaderProps {
  runningCount: number;
  isConnected: boolean;
}

export function Header({ runningCount, isConnected }: HeaderProps) {
  const [time, setTime] = useState(new Date());
  const { profile, role, signOut } = useAuth();

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
            <Badge className="bg-primary/20 text-primary border-primary/30 animate-status-pulse text-[10px] md:text-xs">
              {runningCount} rodando
            </Badge>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success animate-pulse-glow' : 'bg-destructive'}`} />
            <span className="text-[10px] md:text-xs text-muted-foreground">{isConnected ? 'ON' : 'OFF'}</span>
          </div>
          <span className="hidden md:inline font-mono text-xs text-muted-foreground tabular-nums">
            {time.toLocaleTimeString('pt-BR')}
          </span>

          {profile && (
            <div className="flex items-center gap-2 border-l border-border pl-2 md:pl-4">
              <span className="text-sm">{profile.avatar_emoji}</span>
              <div className="hidden sm:block">
                <p className="text-xs font-medium leading-tight">{profile.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{role}</p>
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