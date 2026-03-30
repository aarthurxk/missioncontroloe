import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, ClipboardCopy, AlertTriangle } from "lucide-react";
import { copyErrorToClipboard } from "@/lib/error-format";
import { toast } from "sonner";
import type { Execution, Robot } from "@/lib/types";

interface ExecutionSummaryModalProps {
  open: boolean;
  onClose: () => void;
  execution: Execution | null;
  robot: Robot | null;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export function ExecutionSummaryModal({ open, onClose, execution, robot }: ExecutionSummaryModalProps) {
  if (!execution || !robot) return null;

  const isSuccess = execution.status === "success";
  const isCancelled = execution.status === "cancelled" || execution.status === "cancelling";
  const duration = execution.duration_seconds;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-base">
            <span className="text-2xl">{robot.icon ?? "🤖"}</span>
            <span>{robot.name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Status banner */}
        <div
          className={[
            "rounded-xl p-4 flex items-center gap-4 border",
            isSuccess
              ? "bg-green-500/10 border-green-500/20"
              : isCancelled
              ? "bg-yellow-500/10 border-yellow-500/20"
              : "bg-red-500/10 border-red-500/20",
          ].join(" ")}
        >
          {isSuccess ? (
            <CheckCircle2 className="h-10 w-10 text-green-400 shrink-0" />
          ) : isCancelled ? (
            <AlertTriangle className="h-10 w-10 text-yellow-400 shrink-0" />
          ) : (
            <XCircle className="h-10 w-10 text-red-400 shrink-0" />
          )}
          <div>
            <p
              className={[
                "font-bold text-lg",
                isSuccess ? "text-green-400" : isCancelled ? "text-yellow-400" : "text-red-400",
              ].join(" ")}
            >
              {isSuccess
                ? "Executado com sucesso!"
                : isCancelled
                ? "Execução cancelada"
                : "Erro na execução"}
            </p>
            {duration != null && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3.5 w-3.5" />
                Duração: <span className="font-mono font-medium">{formatDuration(duration)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Error message */}
        {execution.error_message && (
          <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3 space-y-1">
            <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Erro</p>
            <pre className="font-mono text-[11px] text-red-300 whitespace-pre-wrap break-words max-h-28 overflow-y-auto leading-relaxed">
              {execution.error_message}
            </pre>
          </div>
        )}

        {/* Log output */}
        {execution.log_output && (
          <div className="rounded-lg bg-[#0d1117] border border-border overflow-hidden">
            <div className="px-3 py-2 border-b border-white/5 bg-[#161b22]">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Output</p>
            </div>
            <div className="p-3 max-h-40 overflow-y-auto">
              <pre className="font-mono text-[10px] text-green-300 whitespace-pre-wrap break-words leading-relaxed">
                {execution.log_output.length > 3000
                  ? "…" + execution.log_output.slice(-3000)
                  : execution.log_output}
              </pre>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          {!isSuccess && !isCancelled && execution.error_message && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                await copyErrorToClipboard({
                  robotName: robot.name,
                  robotIcon: robot.icon ?? undefined,
                  startedAt: execution.started_at,
                  errorMessage: execution.error_message,
                  logOutput: execution.log_output,
                  triggeredBy: execution.triggered_by,
                });
                toast.success("Erro copiado para a área de transferência");
              }}
            >
              <ClipboardCopy className="h-3 w-3" />
              Copiar erro
            </Button>
          )}
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
