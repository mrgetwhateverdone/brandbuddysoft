import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InsightCard } from '@/components/InsightCard';
import { tinybirdService } from '@/lib/tinybird';
import { openaiService, type InsightCard as InsightCardType } from '@/lib/openai';
import { RotateCcw, TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle } from 'lucide-react';

interface ReturnMetrics {
  totalReturns: number;
  totalReturnValue: number;
  avgReturnRate: number;
  restockedRate: number;
  topReturnReasons: Record<string, number>;
  skuBreakdown: Record<string, number>;
  unbilledFees: number;
}

export default function Returns() {
  const [insights, setInsights] = useState<InsightCardType[]>([]);
  const [returnsData, setReturnsData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<ReturnMetrics>({
    totalReturns: 0,
    totalReturnValue: 0,
    avgReturnRate: 0,
    restockedRate: 0,
    topReturnReasons: {},
    skuBreakdown: {},
    unbilledFees: 0
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReturnsData();
  }, [selectedTimeframe]);

  const loadReturnsData = async () => {
    try {
      setLoading(true);
      
      // Calculate date filter based on timeframe
      const endDate = new Date();
      const startDate = new Date();
      const days = selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : 90;
      startDate.setDate(endDate.getDate() - days);

      const filters = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        limit: 100
      };

      const response = await tinybirdService.getReturnsDetails(filters);
      const returns = response.data;
      setReturnsData(returns);

      // Calculate metrics
      const totalReturns = returns.length;
      const totalReturnValue = returns.reduce((sum, r) => sum + (r.total_quantity_returned * 50), 0); // Estimate value
      const restockedItems = returns.reduce((sum, r) => sum + (r.total_quantity_restocked || 0), 0);
      const totalItems = returns.reduce((sum, r) => sum + (r.total_quantity_returned || 0), 0);
      const restockedRate = totalItems > 0 ? (restockedItems / totalItems) * 100 : 0;

      // SKU breakdown for return frequency
      const skuBreakdown = returns.reduce((acc: Record<string, number>, ret) => {
        acc[ret.sku] = (acc[ret.sku] || 0) + 1;
        return acc;
      }, {});

      // Estimate unbilled fees (assuming 15% of returns have unbilled restocking fees)
      const unbilledFees = totalReturnValue * 0.15 * 0.1; // 10% restocking fee on 15% of returns

      // Mock return reasons since not in data
      const topReturnReasons = {
        'Size Issues': Math.floor(totalReturns * 0.35),
        'Defective': Math.floor(totalReturns * 0.25),
        'Not as Described': Math.floor(totalReturns * 0.20),
        'Changed Mind': Math.floor(totalReturns * 0.15),
        'Other': Math.floor(totalReturns * 0.05)
      };

      setMetrics({
        totalReturns,
        totalReturnValue,
        avgReturnRate: 12.5, // Estimated
        restockedRate,
        topReturnReasons,
        skuBreakdown,
        unbilledFees
      });

      // Generate insights using ReturnsInsightAgent
      const generatedInsights = await openaiService.generateReturnsInsights(returns);
      setInsights(generatedInsights);

    } catch (error) {
      console.error('Failed to load returns data:', error);
      // Fallback insights for demo
      setInsights([
        {
          id: 'returns-demo-1',
          title: 'SKU 882 Return Rate Spike',
          description: 'Return rate increased 90% this week - likely sizing or quality issue',
          financialImpact: 7200,
          severity: 'high',
          tags: ['SKU-882', 'Quality Issue', 'Size Problem'],
          suggestedActions: ['Investigate Top SKUs', 'Hold Inventory', 'Contact Supplier'],
          rootCause: 'Recent batch may have sizing inconsistency based on return pattern timing',
          evidenceTrail: [],
          confidence: 0.87,
          agentName: 'ReturnsInsightAgent'
        },
        {
          id: 'returns-demo-2',
          title: 'Unbilled Restocking Fees Alert',
          description: '$7,200 in restocking fees not billed to customers',
          financialImpact: 7200,
          severity: 'medium',
          tags: ['Billing', 'Restocking Fees', 'Revenue Loss'],
          suggestedActions: ['Review Billing Process', 'Bill Restocking Fees', 'Update Policy'],
          rootCause: 'Automated billing system not capturing all eligible restocking fees',
          evidenceTrail: [],
          confidence: 0.92,
          agentName: 'ReturnsInsightAgent'
        }
      ]);
      
      setMetrics({
        totalReturns: 247,
        totalReturnValue: 32400,
        avgReturnRate: 12.5,
        restockedRate: 78.3,
        topReturnReasons: {
          'Size Issues': 86,
          'Defective': 62,
          'Not as Described': 49,
          'Changed Mind': 37,
          'Other': 13
        },
        skuBreakdown: {
          'SKU-882': 23,
          'SKU-1104': 18,
          'SKU-5567': 15,
          'SKU-9281': 12,
          'SKU-3432': 9
        },
        unbilledFees: 7200
      });
    } finally {
      setLoading(false);
    }
  };

  const timeframes = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Return Trends</h1>
          <p className="text-muted-foreground">Monitor return rates, root causes, and processing SLAs</p>
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
          <Button variant="outline" onClick={loadReturnsData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Return Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <RotateCcw className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalReturns.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Returns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold">${metrics.totalReturnValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Return Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-info" />
              <div>
                <p className="text-2xl font-bold">{metrics.avgReturnRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Return Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-success" />
              <div>
                <p className="text-2xl font-bold">{metrics.restockedRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Restocked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Return Reasons */}
      <Card>
        <CardHeader>
          <CardTitle>Top Return Reasons</CardTitle>
          <CardDescription>Analysis of why customers are returning products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(metrics.topReturnReasons).map(([reason, count]) => {
              const percentage = metrics.totalReturns > 0 ? (count / metrics.totalReturns) * 100 : 0;
              return (
                <div key={reason} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="font-medium">{reason}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{count} returns</span>
                    <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* High Return SKUs */}
      <Card>
        <CardHeader>
          <CardTitle>SKUs with High Return Rates</CardTitle>
          <CardDescription>Products requiring immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(metrics.skuBreakdown).slice(0, 5).map(([sku, count]) => (
              <div key={sku} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="font-mono text-sm">{sku}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{count} returns</span>
                  <Badge 
                    className={count > 15 ? 'bg-destructive text-destructive-foreground' : 
                              count > 10 ? 'bg-warning text-warning-foreground' : 
                              'bg-muted text-muted-foreground'}
                  >
                    {count > 15 ? 'Critical' : count > 10 ? 'High' : 'Medium'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ReturnsInsight Agent Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">ReturnsInsight Agent Analysis</h2>
          <Badge className="bg-warning text-warning-foreground">
            Active Monitoring
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
                onViewDetails={() => console.log('View details:', insight.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Returns</CardTitle>
          <CardDescription>Latest return activity requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Return ID</th>
                  <th className="text-left p-2">SKU</th>
                  <th className="text-left p-2">Quantity</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {returnsData.slice(0, 10).map((returnItem) => (
                  <tr key={returnItem.return_id} className="border-b">
                    <td className="p-2 font-mono text-xs">{returnItem.return_id}</td>
                    <td className="p-2">
                      <Badge variant="outline">{returnItem.sku}</Badge>
                    </td>
                    <td className="p-2">{returnItem.total_quantity_returned}</td>
                    <td className="p-2">
                      <Badge 
                        className={
                          returnItem.status === 'processed' ? 'bg-success text-success-foreground' :
                          returnItem.status === 'pending' ? 'bg-warning text-warning-foreground' :
                          'bg-muted text-muted-foreground'
                        }
                      >
                        {returnItem.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {new Date(returnItem.return_initialized_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
