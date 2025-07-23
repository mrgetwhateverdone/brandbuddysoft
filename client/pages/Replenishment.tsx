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
import { AlertTriangle, Clock, Package, TrendingDown, Calendar, Truck, RefreshCw } from 'lucide-react';

interface ReplenishmentMetrics {
  criticalSKUs: number;
  delayedInbounds: number;
  totalPOsOpen: number;
  avgLeadTime: number;
  stockoutRisk: number;
  totalValueAtRisk: number;
}

interface ReplenishmentAlert {
  sku: string;
  productName: string;
  currentStock: number;
  forecasted_demand: number;
  daysUntilStockout: number;
  inboundPOs: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  estimated_loss: number;
  supplier: string;
  expected_arrival: string;
}

export default function Replenishment() {
  const [insights, setInsights] = useState<InsightCardType[]>([]);
  const [inboundData, setInboundData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<ReplenishmentAlert[]>([]);
  const [metrics, setMetrics] = useState<ReplenishmentMetrics>({
    criticalSKUs: 0,
    delayedInbounds: 0,
    totalPOsOpen: 0,
    avgLeadTime: 0,
    stockoutRisk: 0,
    totalValueAtRisk: 0
  });
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState<InsightCardType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isConnected, error: connectionError } = useTinybirdConnection();

  useEffect(() => {
    loadReplenishmentData();
  }, [selectedRiskLevel]);

  const loadReplenishmentData = async () => {
    try {
      setLoading(true);

      // If not connected to Tinybird, show empty state
      if (!isConnected) {
        setMetrics({
          criticalSKUs: 0,
          delayedInbounds: 0,
          totalPOsOpen: 0,
          avgLeadTime: 0,
          stockoutRisk: 0,
          totalValueAtRisk: 0
        });
        setAlerts([]);
        setInsights([]);
        setLoading(false);
        return;
      }
      
      // Fetch both inbound shipments and inventory data
      const [inboundResponse, inventoryResponse] = await Promise.all([
        tinybirdService.getInboundShipments({ limit: 100 }),
        tinybirdService.getInventoryHealth({ limit: 100 })
      ]);

      const inbound = inboundResponse.data;
      const inventory = inventoryResponse.data;
      
      setInboundData(inbound);
      setInventoryData(inventory);

      // Process data to create replenishment alerts
      const skuMap = new Map<string, any>();
      
      // Group inventory by SKU
      inventory.forEach(item => {
        const key = item.product_sku;
        if (skuMap.has(key)) {
          const existing = skuMap.get(key);
          existing.onhand_quantity += item.onhand_quantity || 0;
          existing.committed_quantity += item.committed_quantity || 0;
        } else {
          skuMap.set(key, { ...item });
        }
      });

      // Create replenishment alerts
      const alerts: ReplenishmentAlert[] = Array.from(skuMap.values()).map(item => {
        // Mock forecast calculations
        const dailyVelocity = Math.max(1, Math.floor(Math.random() * 8) + 2);
        const forecasted_demand = dailyVelocity * 30; // 30-day forecast
        const currentStock = item.onhand_quantity || 0;
        const daysUntilStockout = currentStock > 0 ? Math.floor(currentStock / dailyVelocity) : 0;
        
        // Check for inbound POs for this SKU
        const relatedInbound = inbound.filter(po => po.sku === item.product_sku);
        const inboundPOs = relatedInbound.length;
        const nextArrival = relatedInbound.length > 0 ? relatedInbound[0].expected_arrival_date : '';

        // Determine risk level
        let risk_level: 'critical' | 'high' | 'medium' | 'low' = 'low';
        if (daysUntilStockout < 3) risk_level = 'critical';
        else if (daysUntilStockout < 7) risk_level = 'high';
        else if (daysUntilStockout < 14) risk_level = 'medium';

        // Estimate potential loss
        const avgPrice = 45 + Math.floor(Math.random() * 55);
        const estimated_loss = forecasted_demand * avgPrice * 0.3; // 30% of potential sales

        return {
          sku: item.product_sku,
          productName: item.product_name || `Product ${item.product_sku}`,
          currentStock,
          forecasted_demand,
          daysUntilStockout,
          inboundPOs,
          risk_level,
          estimated_loss,
          supplier: item.supplier || 'Unknown Supplier',
          expected_arrival: nextArrival || 'Not scheduled'
        };
      }).filter(alert => alert.risk_level !== 'low' || alert.daysUntilStockout < 21);

      // Filter by selected risk level
      const filteredAlerts = selectedRiskLevel === 'all' 
        ? alerts 
        : alerts.filter(alert => alert.risk_level === selectedRiskLevel);

      setAlerts(filteredAlerts);

      // Calculate metrics
      const criticalSKUs = alerts.filter(a => a.risk_level === 'critical').length;
      const delayedInbounds = inbound.filter(po => {
        if (!po.expected_arrival_date) return false;
        const expected = new Date(po.expected_arrival_date);
        const today = new Date();
        return expected < today && po.status !== 'received';
      }).length;
      
      const totalPOsOpen = inbound.filter(po => po.status !== 'received').length;
      const avgLeadTime = 12.5; // Mock average
      const stockoutRisk = alerts.filter(a => a.daysUntilStockout < 7).length;
      const totalValueAtRisk = alerts.reduce((sum, a) => sum + a.estimated_loss, 0);

      setMetrics({
        criticalSKUs,
        delayedInbounds,
        totalPOsOpen,
        avgLeadTime,
        stockoutRisk,
        totalValueAtRisk
      });

      // Generate insights using ReplenishmentAgent
      const generatedInsights = await openaiService.generateReplenishmentInsights(inbound, inventory);
      setInsights(generatedInsights);

    } catch (error) {
      console.error('Failed to load replenishment data:', error);
      // Only show error state, no fallback data
      setInsights([]);
      setAlerts([]);
      setMetrics({
        criticalSKUs: 0,
        delayedInbounds: 0,
        totalPOsOpen: 0,
        avgLeadTime: 0,
        stockoutRisk: 0,
        totalValueAtRisk: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const riskLevels = [
    { value: 'all', label: 'All Risk Levels' },
    { value: 'critical', label: 'Critical Only' },
    { value: 'high', label: 'High Risk' },
    { value: 'medium', label: 'Medium Risk' }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'critical': return <AlertTriangle className="h-3 w-3" />;
      case 'high': return <TrendingDown className="h-3 w-3" />;
      case 'medium': return <Clock className="h-3 w-3" />;
      default: return <Package className="h-3 w-3" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Replenishment Alerts</h1>
          <p className="text-muted-foreground">Forecast-driven risk detection for stockouts and supply chain lag</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedRiskLevel} onValueChange={setSelectedRiskLevel}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select risk level" />
            </SelectTrigger>
            <SelectContent>
              {riskLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadReplenishmentData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Replenishment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{metrics.criticalSKUs.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Critical SKUs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold">{metrics.delayedInbounds.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Delayed Inbounds</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4 text-info" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalPOsOpen.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Open POs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.avgLeadTime.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg Lead Time (days)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Value at Risk */}
      <Card className="border-l-4 border-l-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Total Value at Risk</h3>
              <p className="text-sm text-muted-foreground">Estimated revenue impact from potential stockouts</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-destructive">${metrics.totalValueAtRisk.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{metrics.stockoutRisk} SKUs at risk</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ReplenishmentAgent Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">ReplenishmentAgent Analysis</h2>
          <Badge className="bg-destructive text-destructive-foreground">
            Active Forecast Monitoring
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

      {/* Replenishment Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Replenishment Alerts</CardTitle>
          <CardDescription>SKUs requiring immediate attention for replenishment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">SKU</th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Current Stock</th>
                  <th className="text-left p-2">Days Until Stockout</th>
                  <th className="text-left p-2">Inbound POs</th>
                  <th className="text-left p-2">Risk Level</th>
                  <th className="text-left p-2">Est. Loss</th>
                </tr>
              </thead>
              <tbody>
                {alerts.slice(0, 20).map((alert) => (
                  <tr key={alert.sku} className="border-b">
                    <td className="p-2 font-mono text-xs">{alert.sku}</td>
                    <td className="p-2">{alert.productName}</td>
                    <td className="p-2 font-medium">{alert.currentStock.toLocaleString()}</td>
                    <td className="p-2">
                      <span className={`font-medium ${alert.daysUntilStockout < 7 ? 'text-destructive' : 'text-foreground'}`}>
                        {alert.daysUntilStockout} days
                      </span>
                    </td>
                    <td className="p-2">
                      {alert.inboundPOs > 0 ? (
                        <Badge variant="outline">{alert.inboundPOs} PO(s)</Badge>
                      ) : (
                        <Badge className="bg-destructive text-destructive-foreground">None</Badge>
                      )}
                    </td>
                    <td className="p-2">
                      <Badge className={getRiskColor(alert.risk_level)}>
                        <div className="flex items-center space-x-1">
                          {getRiskIcon(alert.risk_level)}
                          <span>{alert.risk_level}</span>
                        </div>
                      </Badge>
                    </td>
                    <td className="p-2 font-medium">${alert.estimated_loss.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {alerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No active replenishment alerts at this risk level.
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
                <p className="text-sm text-muted-foreground">Connect to Tinybird in Settings to view real replenishment data.</p>
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
        onTryAgain={() => loadReplenishmentData()}
        onAddToWorkflow={(insight) => console.log('Add to workflow:', insight)}
      />
    </div>
  );
}
