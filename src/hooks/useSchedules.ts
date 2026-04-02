import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import type { Tables } from "@/integrations/supabase/types";

export type Schedule = Tables<"schedules">;
export type ScheduleWithRobot = Schedule & { robots: Tables<"robots"> | null };

export function useSchedules() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("schedules-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, () => {
        queryClient.invalidateQueries({ queryKey: ["schedules"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*, robots(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ScheduleWithRobot[];
    },
  });
}

// Convert UTC hour/minute from cron to local time
function utcToLocal(utcHour: number, utcMinute: number): { hour: number; minute: number } {
  const d = new Date();
  d.setUTCHours(utcHour, utcMinute, 0, 0);
  return { hour: d.getHours(), minute: d.getMinutes() };
}

// Convert local hour/minute to UTC for cron storage
function localToUtc(localHour: number, localMinute: number): { hour: number; minute: number } {
  const d = new Date();
  d.setHours(localHour, localMinute, 0, 0);
  return { hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

// Parse cron "MIN HOUR * * DOW" to human-readable PT-BR (converts UTC→local)
export function parseCronToDisplay(cron: string | null): string {
  if (!cron) return "—";
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return cron;
  const [minuteStr, hourStr, , , dow] = parts;
  const { hour, minute } = utcToLocal(parseInt(hourStr), parseInt(minuteStr));
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  if (dow === "*") return `Diário • ${time}`;
  const days = dow.split(",").map((d) => dayNames[parseInt(d)] ?? d).join(", ");
  return `${days} • ${time}`;
}

// Extract local time string from a UTC cron expression
export function cronToLocalTime(cron: string | null): string {
  if (!cron) return "09:00";
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 2) return "09:00";
  const { hour, minute } = utcToLocal(parseInt(parts[1]), parseInt(parts[0]));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// Calculate next run from cron "MIN HOUR * * DOW" (cron is in UTC)
export function getNextRunFromCron(cron: string | null): Date | null {
  if (!cron) return null;
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const [minuteStr, hourStr, , , dowStr] = parts;
  const utcMinute = parseInt(minuteStr);
  const utcHour = parseInt(hourStr);
  const daysOfWeek = dowStr === "*" ? [0, 1, 2, 3, 4, 5, 6] : dowStr.split(",").map(Number);
  const now = new Date();
  for (let d = 0; d <= 7; d++) {
    const candidate = new Date(now);
    candidate.setUTCDate(candidate.getUTCDate() + d);
    candidate.setUTCHours(utcHour, utcMinute, 0, 0);
    if (candidate <= now) continue;
    if (daysOfWeek.includes(candidate.getUTCDay())) return candidate;
  }
  return null;
}

// Build cron expression from days + LOCAL time (converts to UTC for storage)
export function buildCronExpression(daysOfWeek: number[], time: string): string {
  const [h, m] = time.split(":").map(Number);
  const localHour = isNaN(h) ? 9 : h;
  const localMinute = isNaN(m) ? 0 : m;
  const { hour: utcHour, minute: utcMinute } = localToUtc(localHour, localMinute);
  const dow = daysOfWeek.length === 0 || daysOfWeek.length === 7
    ? "*"
    : daysOfWeek.sort((a, b) => a - b).join(",");
  return `${utcMinute} ${utcHour} * * ${dow}`;
}
