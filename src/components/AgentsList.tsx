import { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { CategoryBadge } from "./CategoryBadge";
import { cn } from "@/lib/utils";
import type { Robot, Execution } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Play, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface AgentsListProps {
  robots: Robot[];
  executions: Execution[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function AgentsList({ robots, executions, selectedId, onSelect }: AgentsListProps) {
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({});
  const [stopping, setStopping] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  const getLatestExecution = (robotId: string) =>
    executions.find((e) => e.robot_id === robotId);

  const getRunningExecution = (robotId: string) =>
    executions.find(
      (e) => e.robot_id === robotId && (e.status === "running" || e.status === "cancelling")
    );

  const getRobotStatus = (robotId: string) => {
    const latest = getLatestExecution(robotId);
    if (!latest) return "idle";
    return latest.status;
  };

  const handleRunNow = useCallback(
    async (e: React.MouseEvent, robotId: string) => {
      e.stopPropagation();
      setCooldowns((prev) => ({ ...prev, [robotId]: true }));

      const { error } = await supabase.from("executions").insert({
        robot_id: robotId,
        status: "pending",
        triggered_by: "dashboard",
      });

      if (error) {
        toast({ title: "Erro ao enviar comando", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Comando enviado!", description: "Aguardando o agente processar…" });
        queryClient.invalidateQueries({ queryKey: ["executions"] });
      }

      setTimeout(() => setCooldowns((prev) => ({ ...prev, [robotId]: false })), 5000);
    },
    [queryClient]
  );

  const handleStop = useCallback(
    async (e: React.MouseEvent, robotId: string) => {
      e.stopPropagation();
      const running = getRunningExecution(robotId);
      if (!running) return;

      setStopping((prev) => ({ ...prev, [robotId]: true }));

      const { error } = await supabase
        .from("executions")
        .update({ status: "cancelling" })
        .eq("id", running.id);

      if (error) {
        toast({ title: "Erro ao parar robô", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sinal de parada enviado", description: "O agente irá parar em breve." });
        queryClient.invalidateQueries({ queryKey: ["executions"] });
      }

      setTimeout(() => setStopping((prev) => ({ ...prev, [robotId]: false })), 3000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, executions]
  );

  return (
    <div className="flex h-full flex-col md:border-r border-border">
      <div className="border-b border-border px-3 py-2.5 md:px-4">
        <h2 className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          Agents
        </h2>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-0.5 p-2">
          {robots.map((robot) => {
            const latest = getLatestExecution(robot.id);
            const status = getRobotStatus(robot.id);
            const isRunning = status === "running";
            const isCancelling = status === "cancelling";
            const isSelected = selectedId === robot.id;

            return (
              <button
                key={robot.id}
                onClick={() => onSelect(robot.id)}
                className={cn(
                  "w-full rounded-lg p-3 text-left transition-all cursor-pointer relative",
                  isSelected
                    ? "bg-primary/8 border border-primary/20"
                    : "hover:bg-accent/50 border border-transparent"
                )}
              >
                {/* Selected left accent bar */}
                {isSelected && (
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />
                )}

                <div className="flex items-start gap-2.5">
                  <span className="text-base mt-0.5 shrink-0">{robot.icon ?? "🤖"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate">{robot.name}</span>
                      <CategoryBadge category={robot.category} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <StatusBadge status={status} />
                      {latest && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(latest.started_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isRunning || isCancelling ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="mt-2.5 w-full gap-1.5 h-7 text-[11px] font-mono cursor-pointer"
                    disabled={isCancelling || stopping[robot.id]}
                    onClick={(e) => handleStop(e, robot.id)}
                  >
                    {isCancelling || stopping[robot.id] ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        PARANDO…
                      </>
                    ) : (
                      <>
                        <Square className="h-3 w-3" />
                        PARAR
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2.5 w-full gap-1.5 h-7 text-[11px] font-mono cursor-pointer hover:border-primary/40 hover:text-primary"
                    disabled={cooldowns[robot.id]}
                    onClick={(e) => handleRunNow(e, robot.id)}
                  >
                    <Play className="h-3 w-3" />
                    {cooldowns[robot.id] ? "ENVIADO…" : "EXECUTAR"}
                  </Button>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
