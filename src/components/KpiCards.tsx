import { Card, CardContent } from "@/components/ui/card";
import { Bot, Play, AlertTriangle, Clock } from "lucide-react";
import type { Robot, Execution } from "@/lib/types";
import { startOfDay, startOfWeek, startOfMonth, isAfter } from "date-fns";

interface KpiCardsProps {
  robots: Robot[];
  executions: Execution[];
}

export function KpiCards({ robots, executions }: KpiCardsProps) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const todayExecs = executions.filter(e => isAfter(new Date(e.started_at), todayStart));
  const weekErrors = executions.filter(e => isAfter(new Date(e.started_at), weekStart) && e.status === 'error');
  const monthSuccess = executions.filter(e => isAfter(new Date(e.started_at), monthStart) && e.status === 'success');
  const timeSavedSeconds = monthSuccess.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
  const timeSavedHours = (timeSavedSeconds / 3600).toFixed(1);

  const kpis = [
    { label: "Robôs cadastrados", value: robots.length, icon: Bot, color: "text-primary" },
    { label: "Execuções hoje", value: todayExecs.length, icon: Play, color: "text-success" },
    { label: "Erros esta semana", value: weekErrors.length, icon: AlertTriangle, color: "text-destructive" },
    { label: "Tempo economizado (mês)", value: `${timeSavedHours}h`, icon: Clock, color: "text-secondary" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      {kpis.map(kpi => (
        <Card key={kpi.label} className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3">
            <div className={`rounded-lg bg-muted p-1.5 md:p-2 ${kpi.color}`}>
              <kpi.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </div>
            <div>
              <p className="text-lg md:text-xl font-bold tabular-nums">{kpi.value}</p>
              <p className="text-[10px] md:text-[11px] text-muted-foreground">{kpi.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}