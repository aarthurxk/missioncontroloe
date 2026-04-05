import { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { CategoryBadge } from "./CategoryBadge";
import { cn } from "@/lib/utils";
import type { Robot, Execution } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Play, Square, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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
      <div className="border-b border-border px-4 py-2.5">
        <h2 className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          Agents
        </h2>
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className={cn("space-y-0.5", isMobile ? "p-2" : "p-1.5")}>
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
                  "w-full rounded-xl text-left transition-all cursor-pointer relative flex items-center gap-3 group",
                  isMobile ? "px-3 py-3" : "px-2.5 py-2",
                  isSelected
                    ? "bg-primary/8 border border-primary/20"
                    : "hover:bg-accent/50 border border-transparent active:bg-accent/70"
                )}
              >
                {/* Selected left accent */}
                {isSelected && (
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />
                )}

                {/* Robot icon — larger on mobile */}
                <span className={cn("shrink-0", isMobile ? "text-xl" : "text-sm")}>
                  {robot.icon ?? "🤖"}
                </span>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cn("font-medium truncate", isMobile ? "text-sm" : "text-xs")}>
                      {robot.name}
                    </span>
                    <CategoryBadge category={robot.category} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <StatusBadge status={status} />
                    {latest && (
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {formatDistanceToNow(new Date(latest.started_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons — always visible on mobile */}
                {isRunning || isCancelling ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          "shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer",
                          isMobile ? "h-10 w-10" : "h-7 w-7"
                        )}
                        disabled={isCancelling || stopping[robot.id]}
                        onClick={(e) => handleStop(e, robot.id)}
                      >
                        {isCancelling || stopping[robot.id] ? (
                          <Loader2 className={cn("animate-spin", isMobile ? "h-4 w-4" : "h-3.5 w-3.5")} />
                        ) : (
                          <Square className={cn(isMobile ? "h-4 w-4" : "h-3.5 w-3.5")} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs font-mono">
                      {isCancelling ? "Parando…" : "Parar execução"}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          "shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer transition-all",
                          isMobile
                            ? "h-10 w-10 opacity-100 bg-primary/5"
                            : "h-7 w-7 opacity-0 group-hover:opacity-100"
                        )}
                        disabled={cooldowns[robot.id]}
                        onClick={(e) => handleRunNow(e, robot.id)}
                      >
                        {cooldowns[robot.id] ? (
                          <Loader2 className={cn("animate-spin", isMobile ? "h-4 w-4" : "h-3.5 w-3.5")} />
                        ) : (
                          <Play className={cn(isMobile ? "h-4 w-4" : "h-3.5 w-3.5")} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs font-mono">
                      {cooldowns[robot.id] ? "Enviado…" : "Executar agora"}
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Chevron hint on mobile */}
                {isMobile && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
