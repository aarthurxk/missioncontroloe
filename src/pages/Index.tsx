import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { KpiCards } from "@/components/KpiCards";
import { AgentsList } from "@/components/AgentsList";
import { MissionQueue } from "@/components/MissionQueue";
import { RobotDetailDrawer } from "@/components/RobotDetailDrawer";
import { ExecutionSummaryModal } from "@/components/ExecutionSummaryModal";
import { useRobots } from "@/hooks/useRobots";
import { useExecutions } from "@/hooks/useExecutions";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Execution, Robot } from "@/lib/types";

type ExecWithRobot = Execution & { robots: Robot };

const Index = () => {
  const { data: robots = [] } = useRobots();
  const { data: executions = [] } = useExecutions();
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Track running executions to detect completion
  const prevStatuses = useRef<Record<string, string>>({});
  const [summaryExecution, setSummaryExecution] = useState<Execution | null>(null);
  const [summaryRobot, setSummaryRobot] = useState<Robot | null>(null);

  useEffect(() => {
    for (const exec of executions as ExecWithRobot[]) {
      const prev = prevStatuses.current[exec.id];
      const curr = exec.status;

      // Was running (or pending), now finished
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
        <div className="px-3 py-2">
          <KpiCards robots={robots} executions={executions as any} />
        </div>
        <Tabs defaultValue="agents" className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="px-3">
            <TabsList className="w-full">
              <TabsTrigger value="agents" className="flex-1 text-xs">Agents</TabsTrigger>
              <TabsTrigger value="missions" className="flex-1 text-xs">Missions</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="agents" className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <AgentsList
              robots={robots}
              executions={executions as any}
              selectedId={selectedRobotId}
              onSelect={setSelectedRobotId}
            />
          </TabsContent>
          <TabsContent value="missions" className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <MissionQueue executions={executions as any} />
          </TabsContent>
        </Tabs>
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
