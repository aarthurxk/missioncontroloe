import { cn } from "@/lib/utils";

type StatusConfig = {
  label: string;
  dot: string;
  className: string;
  ping?: boolean;
};

const statusConfig: Record<string, StatusConfig> = {
  running: {
    label: "RUNNING",
    dot: "bg-primary",
    ping: true,
    className: "bg-primary/10 text-primary border-primary/25",
  },
  cancelling: {
    label: "PARANDO",
    dot: "bg-warning",
    ping: true,
    className: "bg-warning/10 text-warning border-warning/25",
  },
  pending: {
    label: "PENDING",
    dot: "bg-muted-foreground",
    ping: true,
    className: "bg-muted text-muted-foreground border-border",
  },
  success: {
    label: "SUCCESS",
    dot: "bg-success",
    className: "bg-success/10 text-success border-success/25",
  },
  error: {
    label: "ERROR",
    dot: "bg-destructive",
    className: "bg-destructive/10 text-destructive border-destructive/25",
  },
  warning: {
    label: "WARNING",
    dot: "bg-warning",
    className: "bg-warning/10 text-warning border-warning/25",
  },
  idle: {
    label: "IDLE",
    dot: "bg-muted-foreground/40",
    className: "bg-muted/40 text-muted-foreground border-border/50",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.idle;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase",
        config.className
      )}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {config.ping && (
          <span
            className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", config.dot)}
          />
        )}
        <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", config.dot)} />
      </span>
      {config.label}
    </span>
  );
}
