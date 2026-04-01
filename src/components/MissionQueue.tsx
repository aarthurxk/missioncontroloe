import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { LiveTerminal } from "./LiveTerminal";
import { AlertTriangle, ClipboardCopy, Terminal, Square, Loader2, Trash2, ChevronDown } from "lucide-react";
import type { Execution, Robot } from "@/lib/types";
import { format, isToday } from "date-fns";
import { useEffect, useState } from "react";
import { copyErrorToClipboard } from "@/lib/error-format";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ExecWithRobot = Execution & { robots: Robot };

interface MissionQueueProps {
  executions: ExecWithRobot[];
}

function RunningTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="font-mono text-[10px] text-primary tabular-nums">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

function ExecutionCard({ exec }: { exec: ExecWithRobot }) {
  const [showTerminal, setShowTerminal] = useState(false);
  const [stopping, setStopping] = useState(false);
  const queryClient = useQueryClient();

  const isRunning = exec.status === "running";
  const isCancelling = exec.status === "cancelling";
  const isError = exec.status === "error";

  const handleCopyError = async () => {
    await copyErrorToClipboard({
      robotName: exec.robots?.name ?? "Desconhecido",
      robotIcon: exec.robots?.icon ?? undefined,
      startedAt: exec.started_at,
      errorMessage: exec.error_message,
      logOutput: exec.log_output,
      triggeredBy: exec.triggered_by,
    });
    toast.success("Erro copiado para a área de transferência");
  };

  const handleStop = async () => {
    setStopping(true);
    const { error } = await supabase
      .from("executions")
      .update({ status: "cancelling" })
      .eq("id", exec.id);
    if (error) {
      toast.error("Erro ao enviar sinal de parada");
    } else {
      toast.info("Sinal de parada enviado ao agente");
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    }
    setStopping(false);
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card overflow-hidden transition-colors",
        isRunning && "border-primary/30 bg-primary/5",
        isCancelling && "border-warning/30 bg-warning/5"
      )}
    >
      {/* Single compact row */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 min-w-0">
        <span className="text-sm shrink-0">{exec.robots?.icon ?? "🤖"}</span>

        <span className="text-xs font-medium truncate flex-1 min-w-0">{exec.robots?.name}</span>

        {/* Time / duration */}
        <span className="font-mono text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
          {format(new Date(exec.started_at), "HH:mm")}
        </span>
        {isRunning && <RunningTimer startedAt={exec.started_at} />}
        {!isRunning && !isCancelling && exec.duration_seconds ? (
          <span className="font-mono text-[10px] text-muted-foreground shrink-0">
            {Math.floor(exec.duration_seconds / 60)}m{exec.duration_seconds % 60}s
          </span>
        ) : null}

        <StatusBadge status={exec.status} />

        {/* Icon action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showTerminal ? "default" : "ghost"}
                size="icon"
                className="h-6 w-6 cursor-pointer"
                onClick={() => setShowTerminal((v) => !v)}
              >
                {showTerminal ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <Terminal className="h-3 w-3" />
                )}
                {isRunning && !showTerminal && (
                  <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs font-mono">
              {showTerminal ? "Fechar terminal" : "Ver terminal"}
            </TooltipContent>
          </Tooltip>

          {(isRunning || isCancelling) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  disabled={isCancelling || stopping}
                  onClick={handleStop}
                >
                  {isCancelling || stopping ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Square className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs font-mono">
                {isCancelling ? "Parando…" : "Parar execução"}
              </TooltipContent>
            </Tooltip>
          )}

          {isError && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  onClick={handleCopyError}
                >
                  <ClipboardCopy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs font-mono">
                Copiar erro
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Error preview (collapsed, single line) */}
      {isError && exec.error_message && !showTerminal && (
        <div className="flex items-center gap-1.5 px-2.5 pb-1.5 overflow-hidden">
          <AlertTriangle className="h-2.5 w-2.5 text-destructive shrink-0" />
          <p className="text-[10px] text-destructive font-mono truncate min-w-0">
            {exec.error_message}
          </p>
        </div>
      )}

      {/* Expandable terminal */}
      {showTerminal && (
        <div className="border-t border-border">
          <LiveTerminal
            executionId={exec.id}
            initialLog={exec.log_output}
            status={exec.status}
            onStatusChange={() => {
              queryClient.invalidateQueries({ queryKey: ["executions"] });
            }}
          />
        </div>
      )}
    </div>
  );
}

function Column({
  title,
  children,
  count,
  onClear,
}: {
  title: string;
  children: React.ReactNode;
  count: number;
  onClear?: () => Promise<void>;
}) {
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    if (!onClear) return;
    setClearing(true);
    await onClear();
    setClearing(false);
  };

  return (
    <div className="flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <h3 className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground flex-1">
          {title}
        </h3>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          {count}
        </span>
        {onClear && count > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive cursor-pointer">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar {title.toLowerCase()}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja deletar {count} execuç{count === 1 ? "ão" : "ões"}? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear} disabled={clearing}>
                  {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deletar"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-1 p-2">{children}</div>
      </ScrollArea>
    </div>
  );
}

export function MissionQueue({ executions }: MissionQueueProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const running = executions.filter((e) => e.status === "running" || e.status === "cancelling");
  const completedToday = executions.filter(
    (e) =>
      e.status !== "running" &&
      e.status !== "cancelling" &&
      e.status !== "pending" &&
      isToday(new Date(e.started_at))
  );
  const pending = executions.filter((e) => e.status === "pending");

  const clearByIds = async (items: ExecWithRobot[], label: string) => {
    const ids = items.map((e) => e.id);
    if (ids.length === 0) return;
    const { error } = await supabase.from("executions").delete().in("id", ids);
    if (error) {
      toast.error("Erro ao deletar execuções");
    } else {
      toast.success(
        `${ids.length} execuç${ids.length === 1 ? "ão" : "ões"} removida${ids.length === 1 ? "" : "s"}`
      );
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    }
  };

  if (isMobile) {
    const feed = [...running, ...pending, ...completedToday];
    return (
      <ScrollArea className="h-full">
        {feed.length > 0 ? (
          <div className="space-y-1.5 p-2">
            {feed.length > 0 && (
              <div className="flex justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs text-muted-foreground hover:text-destructive cursor-pointer">
                      <Trash2 className="h-3 w-3" />
                      Limpar tudo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar todas as execuções?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja deletar {feed.length} execuç{feed.length === 1 ? "ão" : "ões"}?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => clearByIds(feed, "todas")}>Deletar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            {feed.map((e) => (
              <ExecutionCard key={e.id} exec={e} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">Nenhuma atividade recente</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              As execuções dos seus robôs aparecerão aqui.
            </p>
          </div>
        )}
      </ScrollArea>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2.5">
        <h2 className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
          Mission Queue
        </h2>
      </div>
      <div className="grid flex-1 min-h-0 grid-cols-3 divide-x divide-border overflow-hidden">
        <Column title="Pendentes" count={pending.length} onClear={() => clearByIds(pending, "pendentes")}>
          {pending.map((e) => (
            <ExecutionCard key={e.id} exec={e} />
          ))}
          {pending.length === 0 && (
            <p className="py-8 text-center text-[11px] text-muted-foreground font-mono">
              Nenhuma missão pendente
            </p>
          )}
        </Column>
        <Column title="In Progress" count={running.length} onClear={() => clearByIds(running, "in progress")}>
          {running.map((e) => (
            <ExecutionCard key={e.id} exec={e} />
          ))}
          {running.length === 0 && (
            <p className="py-8 text-center text-[11px] text-muted-foreground font-mono">
              Nenhuma execução ativa
            </p>
          )}
        </Column>
        <Column title="Concluídas Hoje" count={completedToday.length} onClear={() => clearByIds(completedToday, "concluídas")}>
          {completedToday.map((e) => (
            <ExecutionCard key={e.id} exec={e} />
          ))}
          {completedToday.length === 0 && (
            <p className="py-8 text-center text-[11px] text-muted-foreground font-mono">
              Nenhuma execução hoje
            </p>
          )}
        </Column>
      </div>
    </div>
  );
}
