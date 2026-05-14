import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "./StatusBadge";
import { CategoryBadge } from "./CategoryBadge";
import { LiveTerminal } from "./LiveTerminal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Play, ClipboardCopy, Terminal, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRobotExecutions } from "@/hooks/useExecutions";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const { user } = useAuth();
  const isMobile = useIsMobile();

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

  const runningExec = executions.find((e) => e.status === "running" || e.status === "cancelling");
  const latestExec = executions[0];
  const terminalExec = runningExec ?? latestExec;
  const currentStatus = executions[0]?.status ?? "idle";
  const robotSearchText = `${robot.name} ${robot.description ?? ""} ${robot.script_path ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const asksForEvaluationPeriod =
    robotSearchText.includes("avaliacoes") ||
    robotSearchText.includes("avaliacao") ||
    robotSearchText.includes("orquestrador_avaliacoes");

  const createExecution = async (triggeredBy = "manual") => {
    const { error } = await supabase.from("executions").insert({
      robot_id: robot.id,
      status: "pending",
      triggered_by: triggeredBy,
      triggered_by_user_id: user?.id ?? null,
    });
    if (error) {
      toast.error("Erro ao iniciar execução");
    } else {
      queryClient.invalidateQueries({ queryKey: ["executions"] });
      toast.success("Execução iniciada");
    }
  };

  const handleExecute = async () => {
    if (asksForEvaluationPeriod) {
      setPeriodDialogOpen(true);
      return;
    }
    await createExecution();
  };

  const handleConfirmPeriod = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const start = periodStart || today;
    const end = periodEnd || today;
    await createExecution(`manual|avaliacoes_clinico_geral|${start}|${end}`);
    setPeriodDialogOpen(false);
  };

  const handleToggle = async (checked: boolean) => {
    await supabase.from("robots").update({ is_active: checked }).eq("id", robot.id);
    queryClient.invalidateQueries({ queryKey: ["robots"] });
  };

  const last10 = executions.slice(0, 10);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Periodo da coleta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="avaliacoes-data-inicial">Data inicial</Label>
              <Input
                id="avaliacoes-data-inicial"
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="avaliacoes-data-final">Data final</Label>
              <Input
                id="avaliacoes-data-final"
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmPeriod}>Executar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "h-[85vh] rounded-t-2xl overflow-y-auto bg-card border-border flex flex-col gap-0 p-0 safe-area-bottom"
            : "w-[500px] sm:max-w-[500px] overflow-y-auto bg-card border-border flex flex-col gap-0 p-0"
        }
      >
        {/* Drag handle on mobile */}
        {isMobile && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        {/* Header */}
        <SheetHeader className="px-5 pt-3 pb-4 border-b border-border/50">
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
          {robot.description && (
            <p className="text-sm text-muted-foreground">{robot.description}</p>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleExecute}
              className="gap-2 h-11"
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
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="text-xl font-bold">{successRate}%</p>
              <p className="text-[10px] text-muted-foreground">Sucesso</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="text-xl font-bold">{totalExecs}</p>
              <p className="text-[10px] text-muted-foreground">Execuções</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-center">
              <p className="text-xl font-bold font-mono">{Math.floor(avgDuration / 60)}m</p>
              <p className="text-[10px] text-muted-foreground">Tempo Médio</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-muted rounded-xl">
              <TabsTrigger value="terminal" className="flex-1 gap-1.5 text-xs rounded-lg">
                <Terminal className="h-3.5 w-3.5" />
                Terminal
                {runningExec && (
                  <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse ml-1" />
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 gap-1.5 text-xs rounded-lg">
                <History className="h-3.5 w-3.5" />
                Histórico
              </TabsTrigger>
            </TabsList>

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
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Terminal className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma execução ainda.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Execute o robô para ver o terminal ao vivo.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-3 space-y-4">
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

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Últimas execuções
                </h3>
                <div className="space-y-1">
                  {last10.map((exec) => (
                    <Collapsible key={exec.id}>
                      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-accent/50 active:bg-accent/70 transition-colors min-h-[44px]">
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
                        <div className="ml-2 rounded-xl bg-muted p-3 mt-1">
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
                              className="mt-2 gap-2 text-xs h-9"
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
