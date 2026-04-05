import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { KpiCards } from "@/components/KpiCards";
import { AgentsList } from "@/components/AgentsList";
import { MissionQueue } from "@/components/MissionQueue";
import { RobotDetailDrawer } from "@/components/RobotDetailDrawer";
import { ExecutionSummaryModal } from "@/components/ExecutionSummaryModal";
import { BottomTabBar } from "@/components/BottomTabBar";
import { useRobots } from "@/hooks/useRobots";
import { useExecutions } from "@/hooks/useExecutions";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { Execution, Robot } from "@/lib/types";

type ExecWithRobot = Execution & { robots: Robot };

const Index = () => {
  const { data: robots = [] } = useRobots();
  const { data: executions = [] } = useExecutions();
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"agents" | "missions">("agents");
  const isMobile = useIsMobile();

  // Track running executions to detect completion
  const prevStatuses = useRef<Record<string, string>>({});
  const [summaryExecution, setSummaryExecution] = useState<Execution | null>(null);
  const [summaryRobot, setSummaryRobot] = useState<Robot | null>(null);

  useEffect(() => {
    for (const exec of executions as ExecWithRobot[]) {
      const prev = prevStatuses.current[exec.id];
      const curr = exec.status;
      if (
        (prev === "running" || prev === "cancelling") &&
        (curr === "success" || curr === "error" || curr === "cancelled")
      ) {
        setSummaryExecution(exec);
        setSummaryRobot(exec.robots ?? null);
      }
      prevStatuses.current[exec.id] = curr;
    }
  }, [executions]);

  const runningCount = executions.filter((e) => e.status === "running").length;
  const selectedRobot = robots.find((r) => r.id === selectedRobotId) ?? null;

  if (isMobile) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <Header runningCount={runningCount} isConnected={true} />
        
        <KpiCards robots={robots} executions={executions as any} />

        {/* iOS-style segmented control */}
        <div className="px-4 py-2">
          <div className="relative flex rounded-xl bg-muted p-1">
            <div
              className="absolute top-1 bottom-1 rounded-lg bg-card shadow-sm transition-transform duration-200 ease-out"
              style={{
                width: "calc(50% - 4px)",
                transform: mobileTab === "agents" ? "translateX(0)" : "translateX(calc(100% + 8px))",
              }}
            />
            <button
              onClick={() => setMobileTab("agents")}
              className={cn(
                "relative z-10 flex-1 py-1.5 text-xs font-semibold text-center rounded-lg transition-colors",
                mobileTab === "agents" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Agents
            </button>
            <button
              onClick={() => setMobileTab("missions")}
              className={cn(
                "relative z-10 flex-1 py-1.5 text-xs font-semibold text-center rounded-lg transition-colors",
                mobileTab === "missions" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Missions
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden pb-16">
          {mobileTab === "agents" ? (
            <AgentsList
              robots={robots}
              executions={executions as any}
              selectedId={selectedRobotId}
              onSelect={setSelectedRobotId}
            />
          ) : (
            <MissionQueue executions={executions as any} />
          )}
        </div>

        <BottomTabBar />

        <RobotDetailDrawer
          robot={selectedRobot}
          open={!!selectedRobotId}
          onClose={() => setSelectedRobotId(null)}
        />
        <ExecutionSummaryModal
          open={!!summaryExecution}
          onClose={() => setSummaryExecution(null)}
          execution={summaryExecution}
          robot={summaryRobot}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Header runningCount={runningCount} isConnected={true} />
      <div className="px-6 py-3">
        <KpiCards robots={robots} executions={executions as any} />
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-[320px] shrink-0 overflow-hidden">
          <AgentsList
            robots={robots}
            executions={executions as any}
            selectedId={selectedRobotId}
            onSelect={setSelectedRobotId}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <MissionQueue executions={executions as any} />
        </div>
      </div>
      <RobotDetailDrawer
        robot={selectedRobot}
        open={!!selectedRobotId}
        onClose={() => setSelectedRobotId(null)}
      />
      <ExecutionSummaryModal
        open={!!summaryExecution}
        onClose={() => setSummaryExecution(null)}
        execution={summaryExecution}
        robot={summaryRobot}
      />
    </div>
  );
};

export default Index;
