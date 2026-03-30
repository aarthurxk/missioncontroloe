import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "./StatusBadge";
import { CategoryBadge } from "./CategoryBadge";
import { LiveTerminal } from "./LiveTerminal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Play, ClipboardCopy, Terminal, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRobotExecutions } from "@/hooks/useExecutions";
import { useQueryClient } from "@tanstack/react-query";
import type { Robot } from "@/lib/types";
import { format, subDays, startOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { copyErrorToClipboard } from "@/lib/error-format";

interface Props {
  robot: Robot | null;
  open: boolean;
  onClose: () => void;
}

export function RobotDetailDrawer({ robot, open, onClose }: Props) {
  const { data: executions = [] } = useRobotExecutions(robot?.id ?? null);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("terminal");

  if (!robot) return null;

  // Chart data: last 30 days
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const day = startOfDay(subDays(new Date(), 29 - i));
    const dayExecs = executions.filter((e) => {
      const d = startOfDay(new Date(e.started_at));
      return d.getTime() === day.getTime();
    });
    return {
      date: format(day, "dd/MM"),
      success: dayExecs.filter((e) => e.status === "success").length,
      error: dayExecs.filter((e) => e.status === "error").length,
    };
  });

  const totalExecs = executions.length;
  const successCount = executions.filter((e) => e.status === "success").length;
  const successRate = totalExecs > 0 ? ((successCount / totalExecs) * 100).toFixed(0) : "0";
  const avgDuration =
    totalExecs > 0
      ? Math.round(
          executions
            .filter((e) => e.duration_seconds)
            .reduce((s, e) => s + (e.duration_seconds || 0), 0) /
            Math.max(executions.filter((e) => e.duration_seconds).length, 1)
        )
      : 0;

  // Running or most-recent execution for live terminal
  const runningExec = executions.find((e) => e.status === "running" || e.status === "cancelling");
  const latestExec = executions[0];
  const terminalExec = runningExec ?? latestExec;
  const currentStatus = executions[0]?.status ?? "idle";

  const handleExecute = async () => {
    const { error } = await supabase.from("executions").insert({
      robot_id: robot.id,
      status: "pending",
      triggered_by: "manual",
    });
    if (error) {
      toast.error("Erro ao iniciar execução");
    } else {
      queryClient.invalidateQueries({ queryKey: ["executions"] });
      toast.success("Execução iniciada");
    }
  };

  const handleToggle = async (checked: boolean) => {
    await supabase.from("robots").update({ is_active: checked }).eq("id", robot.id);
    queryClient.invalidateQueries({ queryKey: ["robots"] });
  };

  const last10 = executions.slice(0, 10);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto bg-card border-border flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{robot.icon ?? "🤖"}</span>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-foreground">{robot.name}</SheetTitle>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <CategoryBadge category={robot.category} />
                <StatusBadge status={currentStatus} />
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Description */}
          {robot.description && (
            <p className="text-sm text-muted-foreground">{robot.description}</p>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleExecute}
              className="gap-2"
              disabled={!!runningExec}
            >
              <Play className="h-4 w-4" />
              {runningExec ? "Em execução…" : "Executar Agora"}
            </Button>
            <div className="flex items-center gap-2">
              <Switch checked={robot.is_active} onCheckedChange={handleToggle} />
              <span className="text-sm text-muted-foreground">
                {robot.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xl font-bold">{successRate}%</p>
              <p className="text-[10px] text-muted-foreground">Taxa de Sucesso</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xl font-bold">{totalExecs}</p>
              <p className="text-[10px] text-muted-foreground">Execuções</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-xl font-bold font-mono">{Math.floor(avgDuration / 60)}m</p>
              <p className="text-[10px] text-muted-foreground">Tempo Médio</p>
            </div>
          </div>

          {/* Tabs: Terminal | History | Chart */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-muted">
              <TabsTrigger value="terminal" className="flex-1 gap-1.5 text-xs">
                <Terminal className="h-3.5 w-3.5" />
                Terminal
                {runningExec && (
                  <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse ml-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* Terminal tab */}
            <TabsContent value="terminal" className="mt-3">
              {terminalExec ? (
                <LiveTerminal
                  executionId={terminalExec.id}
                  initialLog={terminalExec.log_output}
                  status={terminalExec.status}
                  onStatusChange={() => {
                    queryClient.invalidateQueries({ queryKey: ["executions"] });
                  }}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <Terminal className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma execução ainda.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Execute o robô para ver o terminal ao vivo.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* History tab */}
            <TabsContent value="history" className="mt-3 space-y-4">
              {/* Chart */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Últimos 30 dias
                </h3>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={0}>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        interval={6}
                      />
                      <YAxis
                        tick={{ fontSize: 9 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        width={20}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(220,33%,10%)",
                          border: "1px solid hsl(215,40%,18%)",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                      />
                      <Bar dataKey="success" stackId="a" fill="hsl(142,71%,45%)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="error" stackId="a" fill="hsl(0,72%,51%)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent executions list */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Últimas execuções
                </h3>
                <div className="space-y-1">
                  {last10.map((exec) => (
                    <Collapsible key={exec.id}>
                      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent/50 transition-colors">
                        <StatusBadge status={exec.status} />
                        <span className="font-mono text-xs text-muted-foreground flex-1">
                          {format(new Date(exec.started_at), "dd/MM HH:mm")}
                        </span>
                        {exec.duration_seconds && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {Math.floor(exec.duration_seconds / 60)}m{exec.duration_seconds % 60}s
                          </span>
                        )}
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-2 rounded-lg bg-muted p-3 mt-1">
                          {exec.log_output && (
                            <pre className="font-mono text-[11px] text-muted-foreground whitespace-pre-wrap break-words max-h-32 overflow-y-auto">
                              {exec.log_output}
                            </pre>
                          )}
                          {exec.error_message && (
                            <pre className="font-mono text-[11px] text-destructive whitespace-pre-wrap break-words mt-2">
                              {exec.error_message}
                            </pre>
                          )}
                          {exec.status === "error" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 gap-2 text-xs h-7"
                              onClick={async () => {
                                await copyErrorToClipboard({
                                  robotName: robot.name,
                                  robotIcon: robot.icon ?? undefined,
                                  startedAt: exec.started_at,
                                  errorMessage: exec.error_message,
                                  logOutput: exec.log_output,
                                  triggeredBy: exec.triggered_by,
                                });
                                toast.success("Erro copiado para a área de transferência");
                              }}
                            >
                              <ClipboardCopy className="h-3 w-3" />
                              Copiar erro
                            </Button>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                  {last10.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">Nenhuma execução registrada.</p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
