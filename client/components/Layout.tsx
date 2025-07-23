import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { InsightDetailModal } from "./InsightDetailModal";
import { useTinybirdConnection } from "@/hooks/use-tinybird-connection";
import type { InsightCard as InsightCardType } from "@/lib/openai";

interface LayoutProps {
  children: React.ReactNode;
}

interface Alert {
  id: string;
  type: "inventory" | "sla" | "shipment" | "general";
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  timestamp: string;
  acknowledged: boolean;
  insightId?: string;
  financialImpact?: number;
}

export function Layout({ children }: LayoutProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedInsight, setSelectedInsight] =
    useState<InsightCardType | null>(null);
  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  const { isConnected } = useTinybirdConnection();

  const handleAlertClick = (alert: Alert) => {
    // Convert alert to insight for modal display
    const insight: InsightCardType = {
      id: alert.id,
      title: alert.title,
      description: alert.description,
      financialImpact: alert.financialImpact || 0,
      severity: alert.severity,
      tags: [alert.type],
      suggestedActions: ["Review Alert", "Create Workflow"],
      rootCause: "System detected operational anomaly requiring decision",
      evidenceTrail: [],
      confidence: 0.85,
      agentName: "AlertSystem",
    };
    setSelectedInsight(insight);
    setIsInsightModalOpen(true);
  };

  const handleAlertDismiss = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert,
      ),
    );
  };

  const handleAddToWorkflow = (alert: Alert) => {
    console.log("Adding alert to workflow:", alert);
    // This would integrate with the workflow system
  };

  const handleInsightAddToWorkflow = (insight: InsightCardType) => {
    console.log("Adding insight to workflow:", insight);
    setIsInsightModalOpen(false);
  };

  const handleCheckConnection = () => {
    // Trigger connection check
    console.log("Checking API connection...");
  };

  const handleTryAgain = () => {
    // Log to audit trail and retry
    console.log("Trying again later...");
    setIsInsightModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav
          alerts={alerts}
          onAlertClick={handleAlertClick}
          onAlertDismiss={handleAlertDismiss}
          onAddToWorkflow={handleAddToWorkflow}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      <InsightDetailModal
        insight={selectedInsight}
        isOpen={isInsightModalOpen}
        onClose={() => setIsInsightModalOpen(false)}
        onCheckConnection={handleCheckConnection}
        onTryAgain={handleTryAgain}
        onAddToWorkflow={handleInsightAddToWorkflow}
      />
    </div>
  );
}
