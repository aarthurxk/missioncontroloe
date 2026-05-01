import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
import { isHoliday, toRecifeLocal } from "../_shared/holidays.ts";

const RECIFE_OFFSET_HOURS = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();

    // Fetch active schedules whose next_run_at is due
    const { data: schedules, error: fetchErr } = await supabase
      .from("schedules")
      .select("id, robot_id, cron_expression, next_run_at, is_active, run_on_holidays")
      .eq("is_active", true)
      .not("next_run_at", "is", null)
      .lte("next_run_at", now.toISOString());

    if (fetchErr) throw fetchErr;
    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ triggered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let triggered = 0;
    let skipped = 0;

    for (const schedule of schedules) {
      const nextRunAt = new Date(schedule.next_run_at);

      // Check if the scheduled time falls on a holiday (Recife local time)
      const local = toRecifeLocal(nextRunAt);
      const holidayCheck = isHoliday(local.year, local.month, local.day);

      if (holidayCheck.holiday) {
        // Skip — don't trigger, just advance to next valid run
        console.log(
          `Skipping schedule ${schedule.id} — ${holidayCheck.name} (${local.year}-${local.month + 1}-${local.day})`
        );
        const nextRun = computeNextRun(schedule.cron_expression, now);
        await supabase
          .from("schedules")
          .update({ next_run_at: nextRun ? nextRun.toISOString() : null })
          .eq("id", schedule.id);
        skipped++;
        continue;
      }

      // Trigger execution
      const { error: insertErr } = await supabase.from("executions").insert({
        robot_id: schedule.robot_id,
        status: "pending",
        triggered_by: "schedule",
      });

      if (insertErr) {
        console.error(`Failed to trigger schedule ${schedule.id}:`, insertErr);
        continue;
      }

      // Advance next_run_at
      const nextRun = computeNextRun(schedule.cron_expression, now);
      await supabase
        .from("schedules")
        .update({ next_run_at: nextRun ? nextRun.toISOString() : null })
        .eq("id", schedule.id);

      triggered++;
    }

    return new Response(
      JSON.stringify({ triggered, skipped, total: schedules.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("trigger-schedules error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Compute next valid run date from a cron expression, skipping holidays.
 * Cron is in Recife local time. Returns UTC Date.
 */
function computeNextRun(cron: string | null, after: Date): Date | null {
  if (!cron) return null;
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return null;

  const [minuteStr, hourStr, , , dowStr] = parts;
  const localMinute = parseInt(minuteStr);
  const localHour = parseInt(hourStr);
  const utcHour = (localHour + RECIFE_OFFSET_HOURS) % 24;
  const dayCarry = localHour + RECIFE_OFFSET_HOURS >= 24 ? 1 : 0;
  const daysOfWeek =
    dowStr === "*"
      ? [0, 1, 2, 3, 4, 5, 6]
      : dowStr.split(",").map(Number);

  for (let d = 0; d <= 60; d++) {
    const candidate = new Date(after);
    candidate.setUTCDate(candidate.getUTCDate() + d + dayCarry);
    candidate.setUTCHours(utcHour, localMinute, 0, 0);

    if (candidate <= after) continue;

    // Get Recife local date
    const local = toRecifeLocal(candidate);

    // Check day of week (using Recife local day)
    const localDate = new Date(local.year, local.month, local.day);
    if (!daysOfWeek.includes(localDate.getDay())) continue;

    // Check holiday
    const hCheck = isHoliday(local.year, local.month, local.day);
    if (hCheck.holiday) continue;

    return candidate;
  }

  return null;
}
