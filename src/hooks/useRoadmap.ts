import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface RoadmapItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface RoadmapStep {
  id: string;
  roadmap_id: string;
  title: string;
  done: boolean;
  position: number;
  created_at: string;
}

export function useRoadmap() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["roadmap"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RoadmapItem[];
    },
  });

  const insertMutation = useMutation({
    mutationFn: async (item: { name: string; description: string; category: string; priority: string }) => {
      const { error } = await supabase.from("roadmap").insert(item);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roadmap"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...fields }: { id: string; name?: string; description?: string; category?: string; priority?: string }) => {
      const { error } = await supabase
        .from("roadmap")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roadmap"] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("roadmap")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roadmap"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roadmap").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roadmap"] }),
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("roadmap-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "roadmap" }, () => {
        queryClient.invalidateQueries({ queryKey: ["roadmap"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "roadmap_steps" }, () => {
        queryClient.invalidateQueries({ queryKey: ["roadmap_steps"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return { ...query, insertMutation, updateMutation, updateStatusMutation, deleteMutation };
}

export function useRoadmapSteps(roadmapId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["roadmap_steps", roadmapId],
    queryFn: async () => {
      if (!roadmapId) return [];
      const { data, error } = await supabase
        .from("roadmap_steps")
        .select("*")
        .eq("roadmap_id", roadmapId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as RoadmapStep[];
    },
    enabled: !!roadmapId,
  });

  const insertStep = useMutation({
    mutationFn: async ({ roadmap_id, title, position }: { roadmap_id: string; title: string; position: number }) => {
      const { error } = await supabase.from("roadmap_steps").insert({ roadmap_id, title, position });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roadmap_steps", roadmapId] }),
  });

  const toggleStep = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("roadmap_steps").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roadmap_steps", roadmapId] }),
  });

  const deleteStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roadmap_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roadmap_steps", roadmapId] }),
  });

  return { ...query, insertStep, toggleStep, deleteStep };
}

export function useAllRoadmapSteps() {
  return useQuery({
    queryKey: ["roadmap_steps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_steps")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return data as RoadmapStep[];
    },
  });
}
