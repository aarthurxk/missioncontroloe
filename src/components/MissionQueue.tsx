import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { LiveTerminal } from "./LiveTerminal";
import { AlertTriangle, ClipboardCopy, Terminal, Square, Loader2, Trash2 } from "lucide-react";
import type { Execution, Robot } from "@/lib/types";
import { format, isToday } from "date-fns";
import { useEffect, useState } from "react";
import { copyErrorToClipboard } from "@/lib/error-format";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
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
    <span className="font-mono text-xs text-primary tabular-nums">
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
        "rounded-lg border bg-card p-3 transition-colors overflow-hidden",
        isRunning && "border-primary/30 bg-primary/5",
        isCancelling && "border-yellow-500/30 bg-yellow-500/5"
      )}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base shrink-0">{exec.robots?.icon ?? "🤖"}</span>
        <span className="text-sm font-medium truncate flex-1 min-w-0">{exec.robots?.name}</span>
        <StatusBadge status={exec.status} />
      </div>

      {/* Timing row */}
      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
        <span>{format(new Date(exec.started_at), "HH:mm")}</span>
        {isRunning ? (
          <RunningTimer startedAt={exec.started_at} />
        ) : exec.duration_seconds ? (
          <span>
            {Math.floor(exec.duration_seconds / 60)}m {exec.duration_seconds % 60}s
          </span>
        ) : null}
      </div>

      {/* Log preview (non-running) */}
      {!isRunning && !isCancelling && exec.log_output && (
        <p className="mt-2 text-[11px] text-muted-foreground font-mono line-clamp-2 leading-relaxed break-all whitespace-pre-wrap">
          {exec.log_output}
        </p>
      )}

      {/* Error */}
      {exec.error_message && (
        <div className="mt-2 flex items-start gap-1.5 rounded bg-destructive/10 p-2 overflow-hidden">
          <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
          <p className="text-[11px] text-destructive font-mono line-clamp-2 flex-1 break-all min-w-0">
            {exec.error_message}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-2 flex gap-2 flex-wrap">
        {/* Terminal toggle */}
        <Button
          variant={showTerminal ? "default" : "outline"}
          size="sm"
          className="gap-1.5 h-7 text-xs flex-1"
          onClick={() => setShowTerminal((v) => !v)}
        >
          <Terminal className="h-3 w-3" />
          {showTerminal ? "Fechar" : "Terminal"}
          {isRunning && !showTerminal && (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse ml-0.5" />
          )}
        </Button>

        {/* Stop button (running only) */}
        {(isRunning || isCancelling) && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 h-7 text-xs"
            disabled={isCancelling || stopping}
            onClick={handleStop}
          >
            {isCancelling || stopping ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Square className="h-3 w-3" />
            )}
            {isCancelling || stopping ? "Parando…" : "Parar"}
          </Button>
        )}

        {/* Copy error */}
        {exec.status === "error" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={handleCopyError}
          >
            <ClipboardCopy className="h-3 w-3" />
            Copiar erro
          </Button>
        )}
      </div>

      {/* Inline live terminal */}
      {showTerminal && (
        <div className="mt-3">
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
      <div className="flex items-center gap-2 border-b p-3 md:p-4">
        <h3 className="text-xs md:text-sm font-semibold uppercase tracking-wider text-muted-foreground flex-1">
          {title}
        </h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
          {count}
        </span>
        {onClear && count > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
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
        <div className="space-y-2 p-2 md:p-3">{children}</div>
      </ScrollArea>
    </div>
  );
}

export function MissionQueue({ executions }: MissionQueueProps) {
  const isMobile = useIsMobile();
  const running = executions.filter((e) => e.status === "running" || e.status === "cancelling");
  const completedToday = executions.filter(
    (e) => e.status !== "running" && e.status !== "cancelling" && isToday(new Date(e.started_at))
  );
  const pending = executions.filter((e) => e.status === "pending");

  if (isMobile) {
    const feed = [...running, ...pending, ...completedToday];
    return (
      <ScrollArea className="h-full">
        {feed.length > 0 ? (
          <div className="space-y-2 p-3">
            {feed.map((e) => (
              <ExecutionCard key={e.id} exec={e} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <span className="text-3xl mb-3">🤖</span>
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
      <div className="border-b p-3 md:p-4">
        <h2 className="text-xs md:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Mission Queue
        </h2>
      </div>
      <div className="grid flex-1 min-h-0 grid-cols-3 divide-x overflow-hidden">
        <Column title="Pendentes" count={pending.length}>
          {pending.map((e) => (
            <ExecutionCard key={e.id} exec={e} />
          ))}
          {pending.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Nenhuma missão pendente.
              <br />
              Conecte seus robôs via agent_bridge.
            </p>
          )}
        </Column>
        <Column title="In Progress" count={running.length}>
          {running.map((e) => (
            <ExecutionCard key={e.id} exec={e} />
          ))}
          {running.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma execução ativa</p>
          )}
        </Column>
        <Column title="Concluídas Hoje" count={completedToday.length}>
          {completedToday.map((e) => (
            <ExecutionCard key={e.id} exec={e} />
          ))}
          {completedToday.length === 0 && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Nenhuma execução registrada ainda.
              <br />
              Conecte seus robôs via agent_bridge.
            </p>
          )}
        </Column>
      </div>
    </div>
  );
}
