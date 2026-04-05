import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useRobots } from "@/hooks/useRobots";
import { useExecutions } from "@/hooks/useExecutions";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, ChevronDown, ClipboardCopy } from "lucide-react";
import { format, isToday, isThisWeek, isThisMonth } from "date-fns";
import { copyErrorToClipboard } from "@/lib/error-format";
import { toast } from "sonner";

const Logs = () => {
  const { data: robots = [] } = useRobots();
  const { data: executions = [] } = useExecutions();
  const [robotFilter, setRobotFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  const runningCount = executions.filter(e => e.status === "running").length;

  const filtered = executions.filter((e: any) => {
    if (robotFilter !== "all" && e.robot_id !== robotFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (periodFilter === "today" && !isToday(new Date(e.started_at))) return false;
    if (periodFilter === "week" && !isThisWeek(new Date(e.started_at), { weekStartsOn: 1 })) return false;
    if (periodFilter === "month" && !isThisMonth(new Date(e.started_at))) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = "Robô,Status,Início,Fim,Duração(s),Triggered By,Log,Erro\n";
    const rows = filtered.map((e: any) =>
      [e.robots?.name, e.status, e.started_at, e.finished_at || '', e.duration_seconds || '', e.triggered_by, `"${(e.log_output || '').replace(/"/g, '""')}"`, `"${(e.error_message || '').replace(/"/g, '""')}"`].join(',')
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission-control-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
      <Header runningCount={runningCount} isConnected={true} />
      <BottomTabBar />
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Logs de Execução</h1>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>

        <div className="flex gap-3">
          <Select value={robotFilter} onValueChange={setRobotFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Robô" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os robôs</SelectItem>
              {robots.map(r => <SelectItem key={r.id} value={r.id}>{r.icon} {r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
            </SelectContent>
          </Select>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Robô</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((exec: any) => (
                <Collapsible key={exec.id} asChild>
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow className="cursor-pointer">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{exec.robots?.icon}</span>
                            <span className="text-sm">{exec.robots?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><StatusBadge status={exec.status} /></TableCell>
                        <TableCell className="font-mono text-xs">{format(new Date(exec.started_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {exec.duration_seconds ? `${Math.floor(exec.duration_seconds / 60)}m ${exec.duration_seconds % 60}s` : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{exec.triggered_by}</TableCell>
                        <TableCell><ChevronDown className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/50">
                          <div className="p-3 space-y-2">
                            {exec.log_output && <pre className="font-mono text-[11px] text-muted-foreground whitespace-pre-wrap">{exec.log_output}</pre>}
                            {exec.error_message && <pre className="font-mono text-[11px] text-destructive whitespace-pre-wrap">{exec.error_message}</pre>}
                            {!exec.log_output && !exec.error_message && <p className="text-xs text-muted-foreground">Sem logs disponíveis</p>}
                            {exec.status === 'error' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 text-xs h-7"
                                onClick={async () => {
                                  await copyErrorToClipboard({
                                    robotName: exec.robots?.name ?? "Desconhecido",
                                    startedAt: exec.started_at,
                                    errorMessage: exec.error_message,
                                    logOutput: exec.log_output,
                                    triggeredBy: exec.triggered_by,
                                  });
                                  toast.success("Erro copiado para a área de transferência");
                                }}
                              >
                                <ClipboardCopy className="h-3 w-3" />
                                📋 Copiar erro
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Nenhuma execução encontrada</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Logs;
