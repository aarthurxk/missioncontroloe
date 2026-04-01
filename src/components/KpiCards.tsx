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
  const weekErrors = executions.filter(e => isAfter(new Date(e.started_at), weekStart) && e.status === "error");
  const monthSuccess = executions.filter(e => isAfter(new Date(e.started_at), monthStart) && e.status === "success");
  const timeSavedSeconds = monthSuccess.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);
  const timeSavedHours = (timeSavedSeconds / 3600).toFixed(1);

  const kpis = [
    {
      label: "Robôs cadastrados",
      value: robots.length,
      icon: Bot,
      iconClass: "text-primary",
      iconBg: "bg-primary/10",
      accent: "linear-gradient(90deg, transparent, hsl(190 100% 50% / 0.5), transparent)",
    },
    {
      label: "Execuções hoje",
      value: todayExecs.length,
      icon: Play,
      iconClass: "text-success",
      iconBg: "bg-success/10",
      accent: "linear-gradient(90deg, transparent, hsl(152 69% 43% / 0.5), transparent)",
    },
    {
      label: "Erros esta semana",
      value: weekErrors.length,
      icon: AlertTriangle,
      iconClass: "text-destructive",
      iconBg: "bg-destructive/10",
      accent: "linear-gradient(90deg, transparent, hsl(0 72% 51% / 0.5), transparent)",
    },
    {
      label: "Tempo economizado (mês)",
      value: `${timeSavedHours}h`,
      icon: Clock,
      iconClass: "text-secondary",
      iconBg: "bg-secondary/10",
      accent: "linear-gradient(90deg, transparent, hsl(263 84% 65% / 0.5), transparent)",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="relative border-border/60 bg-card overflow-hidden">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: kpi.accent }} />
          <CardContent className="flex items-center gap-2 md:gap-3 p-2.5 md:p-4">
            <div className={`rounded-lg p-1.5 md:p-2 shrink-0 ${kpi.iconBg} ${kpi.iconClass}`}>
              <kpi.icon className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold tabular-nums font-mono leading-none">
                {kpi.value}
              </p>
              <p className="text-[10px] md:text-[11px] text-muted-foreground mt-0.5 leading-tight">
                {kpi.label}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
