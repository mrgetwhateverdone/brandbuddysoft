import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { InsightCard } from '@/components/InsightCard';
import { InsightDetailModal } from '@/components/InsightDetailModal';
import { tinybirdService } from '@/lib/tinybird';
import { openaiService, type InsightCard as InsightCardType } from '@/lib/openai';
import { useTinybirdConnection } from '@/hooks/use-tinybird-connection';
import { Clock, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface SLAMetrics {
  overallOTIF: number;
  shippingSLA: number;
  returnsSLA: number;
  receivingSLA: number;
  totalBreaches: number;
  criticalBreaches: number;
  trendDirection: 'up' | 'down' | 'stable';
}

interface SLATarget {
  type: string;
  target: number;
  current: number;
  breaches: number;
  status: 'meeting' | 'warning' | 'failing';
}

interface SLABreach {
  id: string;
  type: 'shipping' | 'receiving' | 'returns';
  order_id?: string;
  sku?: string;
  target_time: number;
  actual_time: number;
  delay_hours: number;
  severity: 'critical' | 'high' | 'medium';
  date: string;
  reason: string;
}

export default function SLA() {
  const [insights, setInsights] = useState<InsightCardType[]>([]);
  const [orderData, setOrderData] = useState<any[]>([]);
  const [shipmentData, setShipmentData] = useState<any[]>([]);
  const [returnsData, setReturnsData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<SLAMetrics>({
    overallOTIF: 0,
    shippingSLA: 0,
    returnsSLA: 0,
    receivingSLA: 0,
    totalBreaches: 0,
    criticalBreaches: 0,
    trendDirection: 'stable'
  });
  const [slaTargets, setSlaTargets] = useState<SLATarget[]>([]);
  const [breaches, setBreaches] = useState<SLABreach[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('7d');
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState<InsightCardType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isConnected, error: connectionError } = useTinybirdConnection();

  useEffect(() => {
    loadSLAData();
  }, [selectedTimeframe]);

  const loadSLAData = async () => {
    try {
      setLoading(true);
      
      // If not connected to Tinybird, show empty state
      if (!isConnected) {
        setMetrics({
          overallOTIF: 0,
          shippingSLA: 0,
          returnsSLA: 0,
          receivingSLA: 0,
          totalBreaches: 0,
          criticalBreaches: 0,
          trendDirection: 'stable'
        });
        setSlaTargets([]);
        setBreaches([]);
        setInsights([]);
        setLoading(false);
        return;
      }

      // Calculate date filter based on timeframe
      const endDate = new Date();
      const startDate = new Date();
      let days;
      switch (selectedTimeframe) {
        case '7d': days = 7; break;
        case '30d': days = 30; break;
        case '90d': days = 90; break;
        case '6m': days = 180; break;
        case '1y': days = 365; break;
        case '18m': days = 548; break;
        case '2y': days = 730; break;
        default: days = 7;
      }
      startDate.setDate(endDate.getDate() - days);

      const filters = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        limit: 100
      };

      // Fetch data from multiple sources
      const [orderResponse, shipmentResponse, returnsResponse] = await Promise.all([
        tinybirdService.getOrderDetails(filters),
        tinybirdService.getOrderShipments(filters),
        tinybirdService.getReturnsDetails(filters)
      ]);

      const orders = orderResponse.data;
      const shipments = shipmentResponse.data;
      const returns = returnsResponse.data;
      
      setOrderData(orders);
      setShipmentData(shipments);
      setReturnsData(returns);

      // Calculate SLA metrics
      const totalOrders = orders.length;
      
      // Mock SLA calculations (in real implementation, would use actual SLA definitions)
      const onTimeShipments = orders.filter(order => {
        const created = new Date(order.created_date);
        const now = new Date();
        const hoursElapsed = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        return order.order_status === 'fulfilled' && hoursElapsed <= 48; // 48-hour SLA
      }).length;

      const shippingSLA = totalOrders > 0 ? (onTimeShipments / totalOrders) * 100 : 0;
      
      // Returns SLA (7-day processing target)
      const onTimeReturns = returns.filter(ret => {
        const initiated = new Date(ret.return_initialized_date);
        const returned = ret.returned_date ? new Date(ret.returned_date) : new Date();
        const daysElapsed = (returned.getTime() - initiated.getTime()) / (1000 * 60 * 60 * 24);
        return daysElapsed <= 7;
      }).length;

      const returnsSLA = returns.length > 0 ? (onTimeReturns / returns.length) * 100 : 0;
      
      // Mock receiving SLA
      const receivingSLA = 94.2;
      
      // Overall OTIF (On Time In Full)
      const overallOTIF = (shippingSLA + returnsSLA + receivingSLA) / 3;

      // Calculate breaches
      const totalBreaches = Math.floor((100 - overallOTIF) * totalOrders / 100);
      const criticalBreaches = Math.floor(totalBreaches * 0.3);

      setMetrics({
        overallOTIF,
        shippingSLA,
        returnsSLA,
        receivingSLA,
        totalBreaches,
        criticalBreaches,
        trendDirection: overallOTIF > 95 ? 'up' : overallOTIF < 90 ? 'down' : 'stable'
      });

      // Set SLA targets
      setSlaTargets([
        {
          type: 'Shipping (48h)',
          target: 97,
          current: shippingSLA,
          breaches: Math.floor((100 - shippingSLA) * totalOrders / 100),
          status: shippingSLA >= 97 ? 'meeting' : shippingSLA >= 90 ? 'warning' : 'failing'
        },
        {
          type: 'Returns (7d)',
          target: 95,
          current: returnsSLA,
          breaches: Math.floor((100 - returnsSLA) * returns.length / 100),
          status: returnsSLA >= 95 ? 'meeting' : returnsSLA >= 85 ? 'warning' : 'failing'
        },
        {
          type: 'Receiving (24h)',
          target: 98,
          current: receivingSLA,
          breaches: 3,
          status: receivingSLA >= 98 ? 'meeting' : receivingSLA >= 90 ? 'warning' : 'failing'
        },
        {
          type: 'Overall OTIF',
          target: 97,
          current: overallOTIF,
          breaches: totalBreaches,
          status: overallOTIF >= 97 ? 'meeting' : overallOTIF >= 90 ? 'warning' : 'failing'
        }
      ]);

      // Generate mock SLA breaches
      const mockBreaches: SLABreach[] = [
        {
          id: 'breach-1',
          type: 'shipping',
          order_id: 'ORD-123456',
          target_time: 48,
          actual_time: 72,
          delay_hours: 24,
          severity: 'high',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          reason: 'Carrier delay due to weather'
        },
        {
          id: 'breach-2',
          type: 'returns',
          order_id: 'RET-789012',
          sku: 'SKU-882',
          target_time: 168, // 7 days in hours
          actual_time: 240, // 10 days
          delay_hours: 72,
          severity: 'medium',
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          reason: 'Processing backlog'
        }
      ];

      setBreaches(mockBreaches);

      // Generate insights using SLAWatchdogAgent
      const generatedInsights = await openaiService.generateSLAInsights(orders, shipments, returns);
      setInsights(generatedInsights);

    } catch (error) {
      console.error('Failed to load SLA data:', error);
      // Only show error state, no fallback data
      setInsights([]);
      setMetrics({
        overallOTIF: 0,
        shippingSLA: 0,
        returnsSLA: 0,
        receivingSLA: 0,
        totalBreaches: 0,
        criticalBreaches: 0,
        trendDirection: 'stable'
      });
      setSlaTargets([]);
    } finally {
      setLoading(false);
    }
  };

  const timeframes = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '1y', label: 'Last Year' },
    { value: '18m', label: 'Last 18 Months' },
    { value: '2y', label: 'Last 2 Years' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'meeting': return 'bg-success text-success-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      case 'failing': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'meeting': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <Clock className="h-4 w-4" />;
      case 'failing': return <XCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">SLA Performance</h1>
          <p className="text-muted-foreground">Track SLA adherence across shipping, receiving, and returns</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              {timeframes.map((timeframe) => (
                <SelectItem key={timeframe.value} value={timeframe.value}>
                  {timeframe.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadSLAData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* SLA Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {metrics.trendDirection === 'up' ? 
                  <TrendingUp className="h-4 w-4 text-success" /> :
                  metrics.trendDirection === 'down' ?
                  <TrendingDown className="h-4 w-4 text-destructive" /> :
                  <Clock className="h-4 w-4 text-muted-foreground" />
                }
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.overallOTIF.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Overall OTIF</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.shippingSLA.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Shipping SLA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalBreaches.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Breaches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{metrics.criticalBreaches.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Critical Breaches</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Targets Performance */}
      <Card>
        <CardHeader>
          <CardTitle>SLA Targets Performance</CardTitle>
          <CardDescription>Current performance vs defined SLA targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {slaTargets.map((target, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(target.status)}
                    <span className="font-medium">{target.type}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-sm font-medium">{target.current.toFixed(1)}%</span>
                      <span className="text-xs text-muted-foreground ml-1">/ {target.target}%</span>
                    </div>
                    <Badge className={getStatusColor(target.status)}>
                      {target.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <Progress value={target.current} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{target.breaches} breaches</span>
                    <span>Target: {target.target}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SLAWatchdog Agent Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">SLAWatchdog Agent Analysis</h2>
          <Badge className="bg-warning text-warning-foreground">
            Continuous Monitoring
          </Badge>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
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
                onAction={(action) => console.log('Action:', action)}
                onViewDetails={() => {
                  setSelectedInsight(insight);
                  setIsModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent SLA Breaches */}
      <Card>
        <CardHeader>
          <CardTitle>Recent SLA Breaches</CardTitle>
          <CardDescription>Latest SLA violations requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Order/ID</th>
                  <th className="text-left p-2">Target Time</th>
                  <th className="text-left p-2">Actual Time</th>
                  <th className="text-left p-2">Delay</th>
                  <th className="text-left p-2">Severity</th>
                  <th className="text-left p-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {breaches.map((breach) => (
                  <tr key={breach.id} className="border-b">
                    <td className="p-2">
                      <Badge variant="outline">{breach.type}</Badge>
                    </td>
                    <td className="p-2 font-mono text-xs">
                      {breach.order_id || breach.sku}
                    </td>
                    <td className="p-2">{breach.target_time}h</td>
                    <td className="p-2">{breach.actual_time}h</td>
                    <td className="p-2 font-medium text-destructive">
                      +{breach.delay_hours}h
                    </td>
                    <td className="p-2">
                      <Badge className={getSeverityColor(breach.severity)}>
                        {breach.severity}
                      </Badge>
                    </td>
                    <td className="p-2 text-muted-foreground text-xs">
                      {breach.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {breaches.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No recent SLA breaches found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Status */}
      {!isConnected && (
        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div>
                <h3 className="font-medium">Tinybird Connection Required</h3>
                <p className="text-sm text-muted-foreground">Connect to Tinybird in Settings to view real SLA performance data.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insight Detail Modal */}
      <InsightDetailModal
        insight={selectedInsight}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInsight(null);
        }}
        onCheckConnection={() => console.log('Check connection')}
        onTryAgain={() => loadSLAData()}
        onAddToWorkflow={(insight) => console.log('Add to workflow:', insight)}
      />
    </div>
  );
}
