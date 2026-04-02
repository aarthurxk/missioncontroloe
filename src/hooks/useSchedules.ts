import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import type { Tables } from "@/integrations/supabase/types";

export type Schedule = Tables<"schedules">;
export type ScheduleWithRobot = Schedule & { robots: Tables<"robots"> | null };

// Recife is always UTC-3 (no DST)
const RECIFE_OFFSET_HOURS = 3;

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

// Parse cron "MIN HOUR * * DOW" to human-readable PT-BR (cron is in Recife local time)
export function parseCronToDisplay(cron: string | null): string {
  if (!cron) return "—";
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return cron;
  const [minuteStr, hourStr, , , dow] = parts;
  const hour = parseInt(hourStr);
  const minute = parseInt(minuteStr);
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  if (dow === "*") return `Diário • ${time}`;
  const days = dow.split(",").map((d) => dayNames[parseInt(d)] ?? d).join(", ");
  return `${days} • ${time}`;
}

// Extract local time string from a cron expression (already in Recife local time)
export function cronToLocalTime(cron: string | null): string {
  if (!cron) return "09:00";
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 2) return "09:00";
  const hour = parseInt(parts[1]);
  const minute = parseInt(parts[0]);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// Calculate next run from cron "MIN HOUR * * DOW" (cron is in Recife local time, UTC-3)
export function getNextRunFromCron(cron: string | null): Date | null {
  if (!cron) return null;
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const [minuteStr, hourStr, , , dowStr] = parts;
  const localMinute = parseInt(minuteStr);
  const localHour = parseInt(hourStr);
  // Convert Recife local time to UTC by adding 3 hours
  const utcHour = (localHour + RECIFE_OFFSET_HOURS) % 24;
  const utcMinute = localMinute;
  const daysOfWeek = dowStr === "*" ? [0, 1, 2, 3, 4, 5, 6] : dowStr.split(",").map(Number);
  const now = new Date();
  for (let d = 0; d <= 7; d++) {
    const candidate = new Date(now);
    candidate.setUTCDate(candidate.getUTCDate() + d);
    // If local hour + 3 crosses midnight, the UTC date is the next day
    if (localHour + RECIFE_OFFSET_HOURS >= 24) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    candidate.setUTCHours(utcHour, utcMinute, 0, 0);
    if (candidate <= now) continue;
    // Check day of week in Recife local time (UTC date minus offset may differ)
    const recifeDate = new Date(candidate.getTime() - RECIFE_OFFSET_HOURS * 60 * 60 * 1000);
    if (daysOfWeek.includes(recifeDate.getUTCDay())) return candidate;
  }
  return null;
}

// Build cron expression from days + LOCAL time (stored as-is in Recife local time)
export function buildCronExpression(daysOfWeek: number[], time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = isNaN(h) ? 9 : h;
  const minute = isNaN(m) ? 0 : m;
  const dow = daysOfWeek.length === 0 || daysOfWeek.length === 7
    ? "*"
    : daysOfWeek.sort((a, b) => a - b).join(",");
  return `${minute} ${hour} * * ${dow}`;
}
