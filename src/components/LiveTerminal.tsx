import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Square, Loader2, Terminal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LiveTerminalProps {
  executionId: string;
  initialLog?: string | null;
  status: string;
  className?: string;
  onStatusChange?: (status: string) => void;
}

function RunTimer({ startedAt }: { startedAt?: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = startedAt ? new Date(startedAt).getTime() : Date.now();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return (
    <span className="font-mono text-[10px] text-primary tabular-nums">
      {Math.floor(elapsed / 60)}m{(elapsed % 60).toString().padStart(2, "0")}s
    </span>
  );
}

export function LiveTerminal({ executionId, initialLog, status: initialStatus, className, onStatusChange }: LiveTerminalProps) {
  const [log, setLog] = useState(initialLog ?? "");
  const [status, setStatus] = useState(initialStatus);
  const [stopping, setStopping] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [startedAt, setStartedAt] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to realtime updates for this execution row
  useEffect(() => {
    const channel = supabase
      .channel(`live-terminal-${executionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "executions", filter: `id=eq.${executionId}` },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (typeof row.log_output === "string") setLog(row.log_output);
          if (typeof row.status === "string") {
            setStatus(row.status);
            onStatusChange?.(row.status);
          }
          if (typeof row.started_at === "string") setStartedAt(row.started_at);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [executionId, onStatusChange]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [log, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  const handleStop = async () => {
    setStopping(true);
    const { error } = await supabase
      .from("executions")
      .update({ status: "cancelling" })
      .eq("id", executionId);
    if (error) {
      toast.error("Erro ao enviar sinal de parada");
    } else {
      toast.info("Sinal de parada enviado ao agente");
    }
    setStopping(false);
  };

  const isRunning = status === "running";
  const isStopping = status === "cancelling";

  const statusColor =
    status === "success" ? "text-green-400" :
    status === "error" ? "text-red-400" :
    isStopping ? "text-yellow-400" :
    isRunning ? "text-primary" : "text-muted-foreground";

  const statusLabel =
    status === "success" ? "● concluído" :
    status === "error" ? "● erro" :
    isStopping ? "⏸ parando…" :
    isRunning ? "● rodando" : status;

  return (
    <div className={cn("rounded-lg border border-border bg-[#0d1117] overflow-hidden flex flex-col", className)}>
      {/* Mac-style terminal header */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-[#161b22] shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="h-3 w-3 rounded-full bg-[#ff5f57] hover:brightness-125 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    onClick={handleStop}
                    disabled={!isRunning || stopping}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Parar execução</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="h-3 w-3 rounded-full bg-[#ffbd2e] hover:brightness-125 transition cursor-pointer"
                    onClick={() => setLog("")}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Limpar output</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="h-3 w-3 rounded-full bg-[#28c940] hover:brightness-125 transition cursor-pointer"
                    onClick={() => {
                      setAutoScroll(true);
                      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Ir ao fim</TooltipContent>
              </Tooltip>
            </div>
            <Terminal className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono text-[11px] text-muted-foreground">terminal — robot agent</span>
          </div>
          <div className="flex items-center gap-3">
            {isRunning && (
              <>
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <RunTimer startedAt={startedAt} />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 gap-1 text-[10px] px-2 py-0"
                  onClick={handleStop}
                  disabled={stopping}
                >
                  <Square className="h-2.5 w-2.5" />
                  Parar
                </Button>
              </>
            )}
            {!isRunning && (
              <span className={cn("font-mono text-[10px]", statusColor)}>{statusLabel}</span>
            )}
          </div>
        </div>
      </TooltipProvider>

      {/* Terminal body */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed min-h-0"
        style={{ maxHeight: 300 }}
      >
        {log ? (
          <pre className="text-green-300 whitespace-pre-wrap break-words">{log}</pre>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>{isRunning ? "Aguardando output do agente…" : "Nenhum output registrado."}</span>
          </div>
        )}
        {isRunning && log && (
          <span className="inline-block w-2 h-3 bg-green-400 animate-pulse ml-0.5 align-text-bottom" />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
