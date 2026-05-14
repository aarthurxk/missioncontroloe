import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export function useExecutions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("executions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "executions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["executions"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ["executions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executions")
        .select("*, robots(*)")
        .not("triggered_by", "like", "download|%")
        .order("started_at", { ascending: false });
      if (error) throw error;

      // Fetch profile names for executions triggered by users
      const userIds = [...new Set(
        data
          .map((e: any) => e.triggered_by_user_id)
          .filter(Boolean)
      )];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.name]));
        }
      }

      return data.map((e: any) => ({
        ...e,
        triggered_by_user_name: e.triggered_by_user_id
          ? profileMap[e.triggered_by_user_id] || null
          : null,
      }));
    },
  });
}

export function useRobotExecutions(robotId: string | null) {
  return useQuery({
    queryKey: ["executions", "robot", robotId],
    enabled: !!robotId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executions")
        .select("*")
        .eq("robot_id", robotId!)
        .not("triggered_by", "like", "download|%")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}
