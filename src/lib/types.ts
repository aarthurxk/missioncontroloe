import type { Tables } from "@/integrations/supabase/types";

export type Robot = Tables<"robots">;
export type Execution = Tables<"executions">;

export type ExecutionWithRobot = Execution & {
  robots: Robot;
};
