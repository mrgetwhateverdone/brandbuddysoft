import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InsightCard } from '@/components/InsightCard';
import { InsightDetailModal } from '@/components/InsightDetailModal';
import { tinybirdService } from '@/lib/tinybird';
import { openaiService, type InsightCard as InsightCardType } from '@/lib/openai';
import { useTinybirdConnection } from '@/hooks/use-tinybird-connection';
import { Activity, DollarSign, TrendingUp, AlertTriangle, Package, Clock, FileText, TrendingDown } from 'lucide-react';

interface WorkflowItem {
  id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'in_progress' | 'completed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  financialImpact: number;
  linkedInsightId?: string;
  createdDate: string;
  dueDate?: string;
}

export default function Dashboard() {
  const [insights, setInsights] = useState<InsightCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalImpact: 0,
    urgentIssues: 0,
    status: 'Monitoring all systems...'
  });
  const [connectionStatus, setConnectionStatus] = useState({
    tinybird: false,
    openai: false
  });

  useEffect(() => {
    loadDashboardData();
    checkConnections();
  }, []);

  const checkConnections = async () => {
    try {
      const [tinybirdResult, openaiResult] = await Promise.all([
        tinybirdService.testConnection(),
        openaiService.testConnection()
      ]);
      
      setConnectionStatus({
        tinybird: tinybirdResult.success,
        openai: openaiResult.success
      });
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch data from multiple sources for comprehensive overview
      const [orderData, inventoryData, returnsData] = await Promise.all([
        tinybirdService.getOrderDetails({ limit: 50 }),
        tinybirdService.getInventoryHealth({ limit: 30 }),
        tinybirdService.getReturnsDetails({ limit: 25 })
      ]);

      // Combine all data for overview analysis
      const combinedData = [
        ...orderData.data.slice(0, 15),
        ...inventoryData.data.slice(0, 10),
        ...returnsData.data.slice(0, 10)
      ];

      // Generate insights using OverviewMonitorAgent
      const generatedInsights = await openaiService.generateOverviewInsights(combinedData);
      setInsights(generatedInsights);

      // Calculate summary metrics
      const totalImpact = generatedInsights.reduce((sum, insight) => sum + Math.abs(insight.financialImpact), 0);
      const urgentIssues = generatedInsights.filter(i => i.severity === 'critical' || i.severity === 'high').length;
      
      setSummary({
        totalImpact,
        urgentIssues,
        status: urgentIssues > 0 
          ? `${urgentIssues} urgent issues detected. Total impact: $${totalImpact.toLocaleString()}.`
          : 'All systems operating within normal parameters.'
      });
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Add fallback insights for demo
      setInsights([
        {
          id: 'demo-1',
          title: 'SKU 9281 Critical Stock Alert',
          description: 'High-demand SKU approaching stockout with no inbound shipments scheduled',
          financialImpact: 18200,
          severity: 'critical',
          tags: ['SKU-9281', 'Stockout Risk', 'Revenue Impact'],
          suggestedActions: ['Create Replenishment Workflow', 'Contact Supplier', 'Review Forecast'],
          rootCause: 'Demand spike (↑140%) combined with delayed supplier shipment creates imminent stockout risk',
          evidenceTrail: [],
          confidence: 0.92,
          agentName: 'OverviewMonitorAgent'
        }
      ]);
      setSummary({
        totalImpact: 18200,
        urgentIssues: 1,
        status: '1 urgent issue detected. Total impact: $18,200.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: string) => {
    // Handle insight actions
    console.log('Action triggered:', action);
  };

  const priorityFilters = [
    { label: 'Critical', value: 'critical', color: 'bg-destructive text-destructive-foreground' },
    { label: 'Revenue Risk', value: 'revenue', color: 'bg-warning text-warning-foreground' },
    { label: 'Supplier Issue', value: 'supplier', color: 'bg-info text-info-foreground' },
    { label: 'Needs Approval', value: 'approval', color: 'bg-muted text-muted-foreground' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Brand Intelligence Overview</h1>
          <p className="text-muted-foreground">5-minute briefing for critical decision-making</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${connectionStatus.tinybird ? 'bg-success' : 'bg-destructive'}`} />
            <span className="text-sm text-muted-foreground">Tinybird</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${connectionStatus.openai ? 'bg-success' : 'bg-destructive'}`} />
            <span className="text-sm text-muted-foreground">OpenAI</span>
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
                <span className="text-lg font-semibold">OverviewMonitorAgent Summary</span>
              </div>
              <p className="text-muted-foreground">{summary.status}</p>
            </div>
            <div className="text-right space-y-1">
              <div className="text-2xl font-bold text-foreground">${summary.totalImpact.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Impact Today</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <p className="text-2xl font-bold">${summary.totalImpact.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">{insights.filter(i => i.tags.some(t => t.includes('SKU'))).length}</p>
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
          <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh Insights'}
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
                onViewDetails={() => console.log('View details:', insight.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
