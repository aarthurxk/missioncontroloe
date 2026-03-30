import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useRobots() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("robots-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "robots" }, () => {
        queryClient.invalidateQueries({ queryKey: ["robots"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return useQuery({
    queryKey: ["robots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("robots").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}
