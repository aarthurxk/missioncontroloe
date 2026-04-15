import type { Tables } from "@/integrations/supabase/types";

export type Robot = Tables<"robots">;
export type Execution = Tables<"executions"> & {
  triggered_by_user_name?: string | null;
};

export type ExecutionWithRobot = Execution & {
  robots: Robot;
};
