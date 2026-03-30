import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  running: { label: "RUNNING", className: "bg-primary/20 text-primary border-primary/30 animate-status-pulse" },
  success: { label: "SUCCESS", className: "bg-success/20 text-success border-success/30" },
  error: { label: "ERROR", className: "bg-destructive/20 text-destructive border-destructive/30" },
  warning: { label: "WARNING", className: "bg-warning/20 text-warning border-warning/30" },
  idle: { label: "IDLE", className: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.idle;
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase", config.className)}>
      {config.label}
    </span>
  );
}
