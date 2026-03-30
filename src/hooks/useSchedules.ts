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

// Parse cron "MIN HOUR * * DOW" to human-readable PT-BR
export function parseCronToDisplay(cron: string | null): string {
  if (!cron) return "—";
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return cron;
  const [minute, hour, , , dow] = parts;
  const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  if (dow === "*") return `Diário • ${time}`;
  const days = dow.split(",").map((d) => dayNames[parseInt(d)] ?? d).join(", ");
  return `${days} • ${time}`;
}

// Calculate next run from cron "MIN HOUR * * DOW"
export function getNextRunFromCron(cron: string | null): Date | null {
  if (!cron) return null;
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const [minuteStr, hourStr, , , dowStr] = parts;
  const minute = parseInt(minuteStr);
  const hour = parseInt(hourStr);
  const daysOfWeek = dowStr === "*" ? [0, 1, 2, 3, 4, 5, 6] : dowStr.split(",").map(Number);
  const now = new Date();
  for (let d = 0; d <= 7; d++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + d);
    candidate.setHours(hour, minute, 0, 0);
    if (candidate <= now) continue;
    if (daysOfWeek.includes(candidate.getDay())) return candidate;
  }
  return null;
}

// Build cron expression from days + time
export function buildCronExpression(daysOfWeek: number[], time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = isNaN(h) ? 9 : h;
  const minute = isNaN(m) ? 0 : m;
  const dow = daysOfWeek.length === 0 || daysOfWeek.length === 7
    ? "*"
    : daysOfWeek.sort((a, b) => a - b).join(",");
  return `${minute} ${hour} * * ${dow}`;
}
