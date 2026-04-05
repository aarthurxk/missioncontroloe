import { useMemo } from "react";
import { Header } from "@/components/Header";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useRobots } from "@/hooks/useRobots";
import { useExecutions } from "@/hooks/useExecutions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Clock, DollarSign, TrendingUp, Trophy, Zap, ArrowUp, ArrowDown,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getNextRunInfo } from "@/hooks/useSchedules";

type Execution = {
  id: string;
  robot_id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  log_output: string | null;
  triggered_by: string;
  robots: {
    id: string;
    name: string;
    icon: string | null;
    category: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
  };
};

const AnalyticsPage = () => {
  const { data: robots = [] } = useRobots();
  const { data: rawExecutions = [] } = useExecutions();
  const executions = rawExecutions as Execution[];

  const { data: hourlyRate = 50 } = useQuery({
    queryKey: ["app_settings", "hourly_rate"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", "hourly_rate")
        .single();
      return data ? Number((data as any).value) : 50;
    },
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("schedules" as any)
        .select("*, robots(*)")
        .order("next_run_at");
      return (data ?? []) as any[];
    },
  });

  const runningCount = executions.filter((e) => e.status === "running").length;

  // ── KPI calculations ──
  const kpis = useMemo(() => {
    const successExecs = executions.filter((e) => e.status === "success");
    const totalSeconds = successExecs.reduce((acc, e) => acc + (e.duration_seconds ?? 0), 0);
    const totalHours = totalSeconds / 3600;
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    const timeSaved = `${hours}h ${minutes}m`;

    const costSaved = totalHours * hourlyRate;

    const successRate =
      executions.length > 0
        ? ((successExecs.length / executions.length) * 100).toFixed(1)
        : "0";

    // Most reliable robot (highest success rate, min 1 execution)
    const robotStats = robots.map((r) => {
      const robotExecs = executions.filter((e) => e.robot_id === r.id);
      const robotSuccess = robotExecs.filter((e) => e.status === "success").length;
      return {
        ...r,
        total: robotExecs.length,
        successRate: robotExecs.length > 0 ? robotSuccess / robotExecs.length : 0,
      };
    });

    const mostReliable = robotStats
      .filter((r) => r.total > 0)
      .sort((a, b) => b.successRate - a.successRate)[0];

    // Most active this month
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const robotMonthly = robots.map((r) => {
      const count = executions.filter(
        (e) =>
          e.robot_id === r.id &&
          new Date(e.started_at) >= monthStart &&
          new Date(e.started_at) <= monthEnd
      ).length;
      return { ...r, count };
    });
    const mostActive = robotMonthly.sort((a, b) => b.count - a.count)[0];

    return { timeSaved, costSaved, successRate, mostReliable, mostActive, robotStats };
  }, [executions, robots, hourlyRate]);

  // ── Monthly chart data (last 6 months) ──
  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(now, 5 - i);
      const label = format(month, "MMM yy", { locale: ptBR });
      const monthExecs = executions.filter((e) =>
        isSameMonth(new Date(e.started_at), month)
      );
      return {
        month: label,
        success: monthExecs.filter((e) => e.status === "success").length,
        error: monthExecs.filter((e) => e.status === "error").length,
      };
    });
  }, [executions]);

  // ── Success rate per robot ──
  const robotSuccessData = useMemo(() => {
    return robots
      .map((r) => {
        const robotExecs = executions.filter((e) => e.robot_id === r.id);
        const successCount = robotExecs.filter((e) => e.status === "success").length;
        const rate = robotExecs.length > 0 ? (successCount / robotExecs.length) * 100 : 0;
        return {
          name: `${r.icon ?? "🤖"} ${r.name}`,
          rate: Math.round(rate * 10) / 10,
          total: robotExecs.length,
        };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.rate - a.rate);
  }, [robots, executions]);

  // ── Month comparison ──
  const comparisonData = useMemo(() => {
    const now = new Date();
    const thisMonth = now;
    const lastMonth = subMonths(now, 1);

    return robots.map((r) => {
      const thisExecs = executions.filter(
        (e) => e.robot_id === r.id && isSameMonth(new Date(e.started_at), thisMonth)
      );
      const lastExecs = executions.filter(
        (e) => e.robot_id === r.id && isSameMonth(new Date(e.started_at), lastMonth)
      );

      const thisErrors = thisExecs.filter((e) => e.status === "error").length;
      const lastErrors = lastExecs.filter((e) => e.status === "error").length;
      const thisSuccess = thisExecs.filter((e) => e.status === "success").length;

      const variation = thisExecs.length - lastExecs.length;
      const successRate =
        thisExecs.length > 0 ? ((thisSuccess / thisExecs.length) * 100).toFixed(1) : "—";

      return {
        icon: r.icon ?? "🤖",
        name: r.name,
        lastCount: lastExecs.length,
        thisCount: thisExecs.length,
        variation,
        lastErrors,
        thisErrors,
        successRate,
      };
    }).filter((r) => r.lastCount > 0 || r.thisCount > 0);
  }, [robots, executions]);

  const getBarColor = (rate: number) => {
    if (rate >= 80) return "#10b981";
    if (rate >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const freqLabel: Record<string, string> = {
    manual: "Manual",
    daily: "Diário",
    weekly: "Semanal",
    monthly: "Mensal",
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header runningCount={runningCount} isConnected={true} />
      <div className="mx-auto w-full max-w-6xl space-y-8 p-6">
        <h1 className="text-xl font-bold">Analytics</h1>

        {/* ── SEÇÃO 1: KPIs ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-border/50">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-primary/10 p-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tempo economizado</p>
                <p className="text-lg font-bold">{kpis.timeSaved}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-success/10 p-2">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo evitado</p>
                <p className="text-lg font-bold">
                  R$ {kpis.costSaved.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-secondary/10 p-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa de sucesso</p>
                <p className="text-lg font-bold">{kpis.successRate}%</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-warning/10 p-2">
                <Trophy className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mais confiável</p>
                <p className="text-sm font-bold truncate">
                  {kpis.mostReliable
                    ? `${kpis.mostReliable.icon ?? "🤖"} ${kpis.mostReliable.name}`
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="flex items-center gap-3 pt-6">
              <div className="rounded-lg bg-primary/10 p-2">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mais ativo (mês)</p>
                <p className="text-sm font-bold truncate">
                  {kpis.mostActive && kpis.mostActive.count > 0
                    ? `${kpis.mostActive.icon ?? "🤖"} ${kpis.mostActive.name}`
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── SEÇÃO 2: Histórico Mensal ── */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Histórico Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 40% 18%)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(220 33% 10%)",
                    border: "1px solid hsl(215 40% 18%)",
                    borderRadius: 8,
                    color: "hsl(210 40% 92%)",
                  }}
                />
                <Bar dataKey="success" name="Sucesso" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="error" name="Erro" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ── SEÇÃO 3: Taxa de Sucesso por Robô ── */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Taxa de Sucesso por Robô</CardTitle>
          </CardHeader>
          <CardContent>
            {robotSuccessData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados de execução.</p>
            ) : (
              <ResponsiveContainer width="100%" height={robotSuccessData.length * 50 + 20}>
                <BarChart data={robotSuccessData} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 40% 18%)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={160}
                    tick={{ fill: "hsl(210 40% 92%)", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(220 33% 10%)",
                      border: "1px solid hsl(215 40% 18%)",
                      borderRadius: 8,
                      color: "hsl(210 40% 92%)",
                    }}
                    formatter={(value: number, _name: string, entry: any) => [
                      `${value}% (${entry.payload.total} execuções)`,
                      "Taxa",
                    ]}
                  />
                  <Bar dataKey="rate" name="Taxa" radius={[0, 4, 4, 0]}>
                    {robotSuccessData.map((entry, index) => (
                      <Cell key={index} fill={getBarColor(entry.rate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── SEÇÃO 4: Comparativo Mês a Mês ── */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Comparativo Mês a Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {comparisonData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados para comparação.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Robô</TableHead>
                    <TableHead className="text-center">Exec. (ant.)</TableHead>
                    <TableHead className="text-center">Exec. (atual)</TableHead>
                    <TableHead className="text-center">Variação</TableHead>
                    <TableHead className="text-center">Erros (ant.)</TableHead>
                    <TableHead className="text-center">Erros (atual)</TableHead>
                    <TableHead className="text-center">Taxa sucesso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-medium">
                        {r.icon} {r.name}
                      </TableCell>
                      <TableCell className="text-center">{r.lastCount}</TableCell>
                      <TableCell className="text-center">{r.thisCount}</TableCell>
                      <TableCell className="text-center">
                        {r.variation > 0 ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <ArrowUp className="h-3 w-3" /> +{r.variation}
                          </span>
                        ) : r.variation < 0 ? (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <ArrowDown className="h-3 w-3" /> {r.variation}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{r.lastErrors}</TableCell>
                      <TableCell className="text-center">{r.thisErrors}</TableCell>
                      <TableCell className="text-center">{r.successRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ── SEÇÃO 5: Próximas Execuções Agendadas ── */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Próximas Execuções Agendadas</CardTitle>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum agendamento configurado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Robô</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Próxima execução</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.robots?.icon ?? "🤖"} {s.robots?.name ?? "—"}
                      </TableCell>
                      <TableCell>{freqLabel[s.frequency] ?? s.frequency}</TableCell>
                      <TableCell>
                        {(() => {
                          const nr = getNextRunInfo(s.cron_expression).nextRun;
                          return nr ? format(nr, "dd/MM/yyyy HH:mm") : "—";
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.is_active ? "default" : "secondary"}>
                          {s.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;
