import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InsightCard } from "@/components/InsightCard";
import { InsightDetailModal } from "@/components/InsightDetailModal";
import { tinybirdService } from "@/lib/tinybird";
import {
  openaiService,
  type InsightCard as InsightCardType,
} from "@/lib/openai";
import { useTinybirdConnection } from "@/hooks/use-tinybird-connection";
import {
  Activity,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Package,
  Clock,
  FileText,
  TrendingDown,
} from "lucide-react";

interface WorkflowItem {
  id: string;
  title: string;
  status: "proposed" | "accepted" | "in_progress" | "completed";
  priority: "critical" | "high" | "medium" | "low";
  financialImpact: number;
  linkedInsightId?: string;
  createdDate: string;
  dueDate?: string;
}

export default function Dashboard() {
  const [insights, setInsights] = useState<InsightCardType[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [selectedInsight, setSelectedInsight] =
    useState<InsightCardType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workflowSort, setWorkflowSort] = useState<
    "impact" | "urgency" | "age"
  >("impact");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    totalImpact: 0,
    urgentIssues: 0,
    status: "Decision engine monitoring all operations...",
  });
  const { isConnected, error: connectionError } = useTinybirdConnection();

  useEffect(() => {
    if (isConnected) {
      loadDashboardData();
    } else {
      setLoading(false);
      setError(connectionError || "Tinybird connection required");
    }
  }, [isConnected, connectionError]);

  const loadDashboardData = async () => {
    if (!isConnected) {
      setError("Tinybird connection required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch data from multiple sources for comprehensive overview
      const [orderData, inventoryData, inboundData] = await Promise.all([
        tinybirdService.getOrderDetails({ limit: 50 }),
        tinybirdService.getInventoryHealth({ limit: 30 }),
        tinybirdService.getInboundShipments({ limit: 25 }),
      ]);

      // Combine all data for overview analysis
      const combinedData = [
        ...orderData.data.slice(0, 15),
        ...inventoryData.data.slice(0, 10),
        ...inboundData.data.slice(0, 10),
      ];

      // Generate insights using OverviewMonitorAgent
      const generatedInsights =
        await openaiService.generateOverviewInsights(combinedData);
      setInsights(generatedInsights);

      // Load mock workflows (in real app, this would come from backend)
      const mockWorkflows: WorkflowItem[] = [
        {
          id: "wf-001",
          title: "Emergency Replenishment for SKU-9281",
          status: "in_progress",
          priority: "critical",
          financialImpact: 18200,
          linkedInsightId: generatedInsights[0]?.id,
          createdDate: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "wf-002",
          title: "Vendor Escalation for Delayed Shipment",
          status: "proposed",
          priority: "high",
          financialImpact: 8500,
          createdDate: new Date(
            Date.now() - 1 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      setWorkflows(mockWorkflows);

      // Calculate summary metrics
      const totalImpact = generatedInsights.reduce(
        (sum, insight) => sum + Math.abs(insight.financialImpact),
        0,
      );
      const urgentIssues = generatedInsights.filter(
        (i) => i.severity === "critical" || i.severity === "high",
      ).length;

      setSummary({
        totalImpact,
        urgentIssues,
        status:
          urgentIssues > 0
            ? `${urgentIssues} decisions pending. Total impact: $${totalImpact.toLocaleString()}.`
            : "All operations running within decision parameters.",
      });
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setError(error instanceof Error ? error.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: string) => {
    console.log("Action triggered:", action);
  };

  const handleInsightClick = (insight: InsightCardType) => {
    setSelectedInsight(insight);
    setIsModalOpen(true);
  };

  const handleAddToWorkflow = (insight: InsightCardType) => {
    const newWorkflow: WorkflowItem = {
      id: `wf-${Date.now()}`,
      title: `Workflow: ${insight.title}`,
      status: "proposed",
      priority:
        insight.severity === "critical"
          ? "critical"
          : insight.severity === "high"
            ? "high"
            : "medium",
      financialImpact: insight.financialImpact,
      linkedInsightId: insight.id,
      createdDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };
    setWorkflows((prev) => [newWorkflow, ...prev]);
    setIsModalOpen(false);
  };

  const getSortedWorkflows = () => {
    return [...workflows].sort((a, b) => {
      switch (workflowSort) {
        case "impact":
          return b.financialImpact - a.financialImpact;
        case "urgency":
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case "age":
          return (
            new Date(a.createdDate).getTime() -
            new Date(b.createdDate).getTime()
          );
        default:
          return 0;
      }
    });
  };

  const getWorkflowStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-success-foreground";
      case "in_progress":
        return "bg-info text-info-foreground";
      case "proposed":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "text-destructive";
      case "high":
        return "text-warning";
      case "medium":
        return "text-info";
      default:
        return "text-muted-foreground";
    }
  };

  const priorityFilters = [
    {
      label: "Critical",
      value: "critical",
      color: "bg-destructive text-destructive-foreground",
    },
    {
      label: "Revenue Risk",
      value: "revenue",
      color: "bg-warning text-warning-foreground",
    },
    {
      label: "Supplier Issue",
      value: "supplier",
      color: "bg-info text-info-foreground",
    },
    {
      label: "Needs Approval",
      value: "approval",
      color: "bg-muted text-muted-foreground",
    },
  ];

  if (!isConnected) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Decision Engine Overview
            </h1>
            <p className="text-muted-foreground">
              Operational decision recommendations and workflow automation
            </p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Tinybird Connection Required</h3>
                <p className="text-sm">
                  {connectionError ||
                    "Unable to connect to Tinybird data source"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Decision Engine Overview
          </h1>
          <p className="text-muted-foreground">
            Operational decision recommendations and workflow automation
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div
              className={`h-2 w-2 rounded-full ${isConnected ? "bg-success" : "bg-destructive"}`}
            />
            <span className="text-sm text-muted-foreground">Tinybird</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-info" />
            <span className="text-sm text-muted-foreground">
              Decision Engine
            </span>
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">
                  OverviewMonitorAgent Summary
                </span>
              </div>
              <p className="text-muted-foreground">{summary.status}</p>
            </div>
            <div className="text-right space-y-1">
              <div className="text-2xl font-bold text-foreground">
                ${summary.totalImpact.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">
                Total Impact Today
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Workflows Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Active Workflows</h2>
          <Select
            value={workflowSort}
            onValueChange={(value) =>
              setWorkflowSort(value as "impact" | "urgency" | "age")
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="impact">Highest Impact</SelectItem>
              <SelectItem value="urgency">Urgency</SelectItem>
              <SelectItem value="age">Age</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {workflows.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active workflows</p>
                <p className="text-xs">
                  Decision workflows will appear here when insights require
                  action
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {getSortedWorkflows()
              .slice(0, 4)
              .map((workflow) => (
                <Card
                  key={workflow.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText
                            className={`h-4 w-4 ${getPriorityColor(workflow.priority)}`}
                          />
                          <Badge
                            className={getWorkflowStatusColor(workflow.status)}
                          >
                            {workflow.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <h4 className="font-medium mb-1">{workflow.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3" />
                            <span>
                              ${workflow.financialImpact.toLocaleString()}
                            </span>
                          </span>
                          {workflow.dueDate && (
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                Due{" "}
                                {new Date(
                                  workflow.dueDate,
                                ).toLocaleDateString()}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{summary.urgentIssues}</p>
                <p className="text-xs text-muted-foreground">Critical Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold">
                  ${summary.totalImpact.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Revenue at Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-info" />
              <div>
                <p className="text-2xl font-bold">
                  {
                    insights.filter((i) =>
                      i.tags.some((t) => t.includes("SKU")),
                    ).length
                  }
                </p>
                <p className="text-xs text-muted-foreground">SKUs Affected</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">1.2m</p>
                <p className="text-xs text-muted-foreground">Avg Response</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Filters */}
      <div className="flex flex-wrap gap-2">
        {priorityFilters.map((filter) => (
          <Badge key={filter.value} className={filter.color}>
            {filter.label}
          </Badge>
        ))}
      </div>

      {/* Critical Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Critical Insights</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh Insights"}
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onAction={handleAction}
                onViewDetails={() => handleInsightClick(insight)}
              />
            ))}
          </div>
        )}
      </div>

      <InsightDetailModal
        insight={selectedInsight}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCheckConnection={() => console.log("Checking connection...")}
        onTryAgain={() => console.log("Trying again...")}
        onAddToWorkflow={handleAddToWorkflow}
      />
    </div>
  );
}
