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
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data;
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
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}
