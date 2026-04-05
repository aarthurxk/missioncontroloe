import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useRobots } from "@/hooks/useRobots";
import { useExecutions } from "@/hooks/useExecutions";
import { useSchedules, parseCronToDisplay, getNextRunFromCron, getNextRunInfo, buildCronExpression, cronToLocalTime } from "@/hooks/useSchedules";
import type { ScheduleWithRobot } from "@/hooks/useSchedules";
import { getNextHolidays, isHoliday, scopeLabel } from "@/lib/holidays";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, CalendarClock, Clock, Calendar, AlertTriangle, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const DAYS = [
  { label: "Dom", value: 0, short: "D" },
  { label: "Seg", value: 1, short: "S" },
  { label: "Ter", value: 2, short: "T" },
  { label: "Qua", value: 3, short: "Q" },
  { label: "Qui", value: 4, short: "Q" },
  { label: "Sex", value: 5, short: "S" },
  { label: "Sáb", value: 6, short: "S" },
];

// ── Schedule Form ──
interface ScheduleFormProps {
  schedule?: ScheduleWithRobot;
  onDone: () => void;
}

function ScheduleForm({ schedule, onDone }: ScheduleFormProps) {
  const { data: robots = [] } = useRobots();
  const queryClient = useQueryClient();

  // Parse existing schedule
  const parsedDays = (): number[] => {
    if (!schedule?.cron_expression) return [1, 2, 3, 4, 5];
    const parts = schedule.cron_expression.trim().split(/\s+/);
    if (parts.length < 5) return [1, 2, 3, 4, 5];
    const dow = parts[4];
    if (dow === "*") return [0, 1, 2, 3, 4, 5, 6];
    return dow.split(",").map(Number);
  };

  const parsedTime = (): string => {
    return cronToLocalTime(schedule?.cron_expression ?? null);
  };

  const [robotId, setRobotId] = useState(schedule?.robot_id ?? "");
  const [selectedDays, setSelectedDays] = useState<number[]>(parsedDays());
  const [time, setTime] = useState(parsedTime());
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const cronExpression = buildCronExpression(selectedDays, time);
  const runInfo = getNextRunInfo(cronExpression);
  const nextRun = runInfo.nextRun;
  const displayLabel = parseCronToDisplay(cronExpression);

  const allDays = selectedDays.length === 7;
  const weekdays = selectedDays.length === 5 && !selectedDays.includes(0) && !selectedDays.includes(6);

  const handleSave = async () => {
    if (!robotId) {
      toast.error("Selecione um robô");
      return;
    }
    if (selectedDays.length === 0) {
      toast.error("Selecione pelo menos um dia");
      return;
    }
    setSaving(true);
    const frequency = allDays ? "daily" : weekdays ? "weekdays" : "custom";
    const payload = {
      robot_id: robotId,
      cron_expression: cronExpression,
      frequency,
      next_run_at: nextRun?.toISOString() ?? null,
      is_active: schedule?.is_active ?? true,
    };

    let error;
    if (schedule) {
      ({ error } = await supabase.from("schedules").update(payload).eq("id", schedule.id));
    } else {
      ({ error } = await supabase.from("schedules").insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar agendamento: " + error.message);
    } else {
      toast.success(schedule ? "Agendamento atualizado" : "Agendamento criado");
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      onDone();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* Robot picker */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Robô</label>
        <Select value={robotId} onValueChange={setRobotId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione um robô..." />
          </SelectTrigger>
          <SelectContent>
            {robots.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                <span className="flex items-center gap-2">
                  <span>{r.icon ?? "🤖"}</span>
                  <span>{r.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Day picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Dias da semana</label>
        <div className="flex gap-1.5">
          {DAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDay(d.value)}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-semibold transition-all border",
                selectedDays.includes(d.value)
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        {/* Quick selects */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedDays([1, 2, 3, 4, 5])}
          >
            Dias úteis
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
          >
            Todos os dias
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedDays([])}
          >
            Limpar
          </Button>
        </div>
      </div>

      {/* Time picker */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Horário
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {/* Preview */}
      {selectedDays.length > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-primary">Resumo do agendamento</p>
          <p className="text-sm font-medium">{displayLabel}</p>
          {nextRun && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Próxima execução:{" "}
              <span className="font-mono font-medium text-foreground">
                {format(nextRun, "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}
              </span>
            </p>
          )}
          {runInfo.skippedHoliday && (
            <p className="text-xs flex items-center gap-1.5 text-yellow-500">
              <AlertTriangle className="h-3 w-3" />
              Feriado pulado: {runInfo.skippedHoliday.name} em{" "}
              {format(runInfo.skippedHoliday.date, "dd/MM (EEEE)", { locale: ptBR })}
            </p>
          )}
          <p className="font-mono text-[10px] text-muted-foreground">cron: {cronExpression}</p>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Salvando…" : schedule ? "Salvar alterações" : "Criar agendamento"}
      </Button>
    </div>
  );
}

// ── Schedule Card ──
function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
}: {
  schedule: ScheduleWithRobot;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (active: boolean) => {
    setToggling(true);
    await supabase.from("schedules").update({ is_active: active }).eq("id", schedule.id);
    queryClient.invalidateQueries({ queryKey: ["schedules"] });
    setToggling(false);
  };

  const runInfo = getNextRunInfo(schedule.cron_expression);
  const nextRun = runInfo.nextRun;

  const isOverdue = nextRun && nextRun < new Date();

  return (
    <Card className={cn("border-border/60 transition-all", !schedule.is_active && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Robot icon */}
          <div className="text-2xl shrink-0 mt-0.5">{schedule.robots?.icon ?? "🤖"}</div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{schedule.robots?.name ?? "Robô desconhecido"}</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-mono",
                  schedule.is_active
                    ? "border-green-500/30 text-green-400 bg-green-500/10"
                    : "border-muted text-muted-foreground"
                )}
              >
                {schedule.is_active ? "● ativo" : "○ pausado"}
              </Badge>
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
              <CalendarClock className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{parseCronToDisplay(schedule.cron_expression)}</span>
            </div>

            {nextRun && (
              <p className={cn("mt-1 text-xs flex items-center gap-1", isOverdue ? "text-yellow-400" : "text-muted-foreground")}>
                <Clock className="h-3 w-3" />
                {isOverdue ? "Atrasada · " : "Próxima execução · "}
                <span className="font-mono">
                  {format(nextRun, "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              </p>
            )}

            {runInfo.skippedHoliday && schedule.is_active && (
              <p className="mt-1 text-xs flex items-center gap-1 text-yellow-500">
                <AlertTriangle className="h-3 w-3" />
                Feriado pulado: {runInfo.skippedHoliday.name} ({format(runInfo.skippedHoliday.date, "dd/MM", { locale: ptBR })})
              </p>
            )}

            <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
              {schedule.cron_expression}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={schedule.is_active}
              onCheckedChange={handleToggle}
              disabled={toggling}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O agendamento de <strong>{schedule.robots?.name}</strong> será removido permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──
const SchedulerPage = () => {
  const { data: schedules = [] } = useSchedules();
  const { data: executions = [] } = useExecutions();
  const queryClient = useQueryClient();
  const runningCount = executions.filter((e) => e.status === "running").length;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleWithRobot | undefined>();

  const activeCount = schedules.filter((s) => s.is_active).length;

  const handleDelete = async (id: string) => {
    await supabase.from("schedules").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["schedules"] });
    toast.success("Agendamento excluído");
  };

  const openCreate = () => {
    setEditingSchedule(undefined);
    setDialogOpen(true);
  };

  const openEdit = (s: ScheduleWithRobot) => {
    setEditingSchedule(s);
    setDialogOpen(true);
  };

  // Group by robot
  const byRobot = schedules.reduce<Record<string, ScheduleWithRobot[]>>((acc, s) => {
    const key = s.robot_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 md:pb-0">
      <Header runningCount={runningCount} isConnected={true} />
      <BottomTabBar />

      <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Agendamentos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {schedules.length === 0
                ? "Nenhum agendamento configurado"
                : `${schedules.length} agendamento${schedules.length !== 1 ? "s" : ""} · ${activeCount} ativo${activeCount !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>

        {/* Stats bar */}
        {schedules.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold">{schedules.length}</p>
                <p className="text-[11px] text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-green-400">{activeCount}</p>
                <p className="text-[11px] text-muted-foreground">Ativos</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground">{schedules.length - activeCount}</p>
                <p className="text-[11px] text-muted-foreground">Pausados</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Schedules list */}
        {schedules.length === 0 ? (
          <Card className="border-dashed border-border/50">
            <CardContent className="py-16 text-center space-y-3">
              <CalendarClock className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <div>
                <p className="font-medium text-muted-foreground">Nenhum agendamento ainda</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Crie agendamentos para seus robôs rodarem automaticamente em dias e horários definidos.
                </p>
              </div>
              <Button onClick={openCreate} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Criar primeiro agendamento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(byRobot).map(([robotId, robotSchedules]) => {
              const robot = robotSchedules[0]?.robots;
              return (
                <div key={robotId} className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>{robot?.icon ?? "🤖"}</span>
                    <span>{robot?.name ?? "Robô"}</span>
                    <span className="text-muted-foreground/50">({robotSchedules.length})</span>
                  </div>
                  {robotSchedules.map((s) => (
                    <ScheduleCard
                      key={s.id}
                      schedule={s}
                      onEdit={() => openEdit(s)}
                      onDelete={() => handleDelete(s.id)}
                    />
                  ))}
        {/* Próximos feriados */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
              <PartyPopper className="h-4 w-4" />
              Próximos feriados
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="border-border/50 mt-2">
              <CardContent className="p-3 space-y-2">
                {getNextHolidays(8).map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {format(h.date, "dd/MM", { locale: ptBR })}
                      </span>
                      <span>{h.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {scopeLabel(h.scope)}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingSchedule(undefined); }}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              {editingSchedule ? "Editar agendamento" : "Novo agendamento"}
            </DialogTitle>
          </DialogHeader>
          <ScheduleForm
            schedule={editingSchedule}
            onDone={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchedulerPage;
