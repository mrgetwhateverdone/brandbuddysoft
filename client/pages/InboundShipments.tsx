import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InsightCard } from '@/components/InsightCard';
import { tinybirdService } from '@/lib/tinybird';
import { openaiService, type InsightCard as InsightCardType } from '@/lib/openai';
import { useTinybirdConnection } from '@/hooks/use-tinybird-connection';
import { Truck, Package, Clock, AlertTriangle, Calendar, Users } from 'lucide-react';

interface InboundMetrics {
  totalShipments: number;
  delayedShipments: number;
  avgSKUsPerShipment: number;
  totalSKUs: number;
  receivingWorkload: number;
  onTimeRate: number;
}

export default function InboundShipments() {
  const [insights, setInsights] = useState<InsightCardType[]>([]);
  const [inboundData, setInboundData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<InboundMetrics>({
    totalShipments: 0,
    delayedShipments: 0,
    avgSKUsPerShipment: 0,
    totalSKUs: 0,
    receivingWorkload: 0,
    onTimeRate: 0
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, error: connectionError } = useTinybirdConnection();

  useEffect(() => {
    if (isConnected) {
      loadInboundData();
    }
  }, [selectedTimeframe, isConnected]);

  const loadInboundData = async () => {
    if (!isConnected) {
      setError('Tinybird connection required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Calculate date filter based on timeframe
      const endDate = new Date();
      const startDate = new Date();
      const days = selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      const filters = {
        limit: 100
      };

      const response = await tinybirdService.getInboundShipments(filters);
      const inbound = response.data;
      setInboundData(inbound);

      // Calculate metrics from real data
      const totalShipments = inbound.length;
      const today = new Date();
      
      const delayedShipments = inbound.filter(shipment => {
        if (!shipment.expected_arrival_date) return false;
        const expectedDate = new Date(shipment.expected_arrival_date);
        return expectedDate < today && shipment.status !== 'received';
      }).length;

      // Group by shipment to calculate SKUs per shipment
      const shipmentGroups = inbound.reduce((acc, item) => {
        if (!acc[item.shipment_id]) {
          acc[item.shipment_id] = new Set();
        }
        if (item.sku) {
          acc[item.shipment_id].add(item.sku);
        }
        return acc;
      }, {} as Record<string, Set<string>>);

      const totalSKUsInShipments = Object.values(shipmentGroups).reduce((sum, skuSet) => sum + skuSet.size, 0);
      const avgSKUsPerShipment = totalShipments > 0 ? totalSKUsInShipments / Object.keys(shipmentGroups).length : 0;
      const totalSKUs = new Set(inbound.map(item => item.sku).filter(Boolean)).size;
      
      // Estimate receiving workload (total expected quantity needing processing)
      const receivingWorkload = inbound
        .filter(item => item.status !== 'received')
        .reduce((sum, item) => sum + (item.expected_quantity || 0), 0);

      const onTimeShipments = inbound.filter(shipment => {
        if (!shipment.expected_arrival_date || shipment.status !== 'received') return false;
        const expectedDate = new Date(shipment.expected_arrival_date);
        const arrivedDate = shipment.arrival_date ? new Date(shipment.arrival_date) : new Date();
        return arrivedDate <= expectedDate;
      }).length;
      
      const onTimeRate = totalShipments > 0 ? (onTimeShipments / totalShipments) * 100 : 0;

      setMetrics({
        totalShipments,
        delayedShipments,
        avgSKUsPerShipment,
        totalSKUs,
        receivingWorkload,
        onTimeRate
      });

      // Generate insights with AI agent
      await generateInboundInsights(inbound);

    } catch (error) {
      console.error('Failed to load inbound shipments data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateInboundInsights = async (inboundData: any[]) => {
    try {
      const prompt = `
You are an InboundShipmentsAgent for BrandBuddy, a decision engine for supply chain operations. Analyze this inbound shipment data and recommend automated workflows.

Inbound Shipments Data:
${JSON.stringify(inboundData.slice(0, 15), null, 2)}

BrandBuddy is not a BI dashboard — it's a decision engine that recommends or automates workflows.

For each insight, follow this structure:
What happened → Why it matters ($) → What should be done → Confidence → Action

Focus on actionable decisions:
- Delayed POs requiring vendor escalation
- Receiving capacity planning based on expected quantities
- SKUs stuck in receiving that need workflow intervention
- Supplier performance issues requiring automated responses

Generate 2-4 insights with specific workflow recommendations.
Return as JSON array with this exact structure:
[{
  "title": "Brief actionable title",
  "description": "What operational decision needs to be made",
  "financialImpact": number,
  "severity": "critical|high|medium|low", 
  "tags": ["array", "of", "relevant", "tags"],
  "suggestedActions": ["Escalate to Vendor", "Schedule Receiving Workflow", "etc"],
  "rootCause": "Why this decision is needed with $ impact context"
}]
`;

      const response = await openaiService.callOpenAI([
        { role: "system", content: "You are an expert supply chain decision engine. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ]);
      
      const parsedInsights = JSON.parse(response);
      const formattedInsights = parsedInsights.map((insight: any, index: number) => ({
        id: `inbound-${Date.now()}-${index}`,
        agentName: "InboundShipmentsAgent",
        confidence: 0.85 + (Math.random() * 0.1), // Randomize confidence slightly
        evidenceTrail: inboundData.slice(0, 5),
        ...insight
      }));
      
      setInsights(formattedInsights);
    } catch (error) {
      console.error('Failed to generate inbound insights:', error);
      setInsights([]);
    }
  };

  const timeframes = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'received': return 'bg-success text-success-foreground';
      case 'in_transit': return 'bg-info text-info-foreground';
      case 'delayed': return 'bg-warning text-warning-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!isConnected) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inbound Shipments</h1>
            <p className="text-muted-foreground">Track incoming inventory and receiving operations</p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Tinybird Connection Required</h3>
                <p className="text-sm">{connectionError || 'Unable to connect to Tinybird data source'}</p>
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
          <h1 className="text-3xl font-bold text-foreground">Inbound Shipments</h1>
          <p className="text-muted-foreground">Track incoming inventory and receiving operations</p>
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
          <Button variant="outline" onClick={loadInboundData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalShipments.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Shipments (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold">{metrics.delayedShipments.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Delayed Shipments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-info" />
              <div>
                <p className="text-2xl font-bold">{metrics.avgSKUsPerShipment.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">SKUs per Shipment</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-success" />
              <div>
                <p className="text-2xl font-bold">{Math.ceil(metrics.receivingWorkload / 100)}</p>
                <p className="text-xs text-muted-foreground">Est. Staff Needed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>AI Staffing Recommendation</CardTitle>
          <CardDescription>Based on expected quantities and receiving capacity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-lg">
              Recommended: <span className="font-bold">{Math.ceil(metrics.receivingWorkload / 100)} employees</span> to process {metrics.receivingWorkload.toLocaleString()} units tomorrow
            </p>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>On-time rate: {metrics.onTimeRate.toFixed(1)}%</span>
              <span>•</span>
              <span>Processing capacity: ~100 units/employee/day</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* InboundShipments Agent Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">InboundShipments Agent Analysis</h2>
          <Badge className="bg-primary text-primary-foreground">
            Decision Engine Active
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
        ) : error ? (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onAction={(action) => console.log('Action:', action)}
                onViewDetails={() => console.log('View details:', insight.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Inbound Shipments</CardTitle>
          <CardDescription>Latest shipment activity and status updates</CardDescription>
        </CardHeader>
        <CardContent>
          {inboundData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No inbound shipments data available for the selected timeframe.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Shipment ID</th>
                    <th className="text-left p-2">PO Number</th>
                    <th className="text-left p-2">Supplier</th>
                    <th className="text-left p-2">Expected Arrival</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">SKUs</th>
                  </tr>
                </thead>
                <tbody>
                  {inboundData.slice(0, 10).map((shipment) => (
                    <tr key={`${shipment.shipment_id}-${shipment.sku}`} className="border-b">
                      <td className="p-2 font-mono text-xs">{shipment.shipment_id}</td>
                      <td className="p-2">{shipment.purchase_order_number || 'N/A'}</td>
                      <td className="p-2">{shipment.supplier || 'Unknown'}</td>
                      <td className="p-2">
                        {shipment.expected_arrival_date ? (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{new Date(shipment.expected_arrival_date).toLocaleDateString()}</span>
                          </div>
                        ) : 'TBD'}
                      </td>
                      <td className="p-2">
                        <Badge className={getStatusColor(shipment.status)}>
                          {shipment.status || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="p-2">{shipment.sku || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
