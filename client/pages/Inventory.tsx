import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { InsightCard } from '@/components/InsightCard';
import { InsightDetailModal } from '@/components/InsightDetailModal';
import { tinybirdService } from '@/lib/tinybird';
import { openaiService, type InsightCard as InsightCardType } from '@/lib/openai';
import { useTinybirdConnection } from '@/hooks/use-tinybird-connection';
import { Box, AlertTriangle, TrendingUp, TrendingDown, Package, Search, RefreshCw } from 'lucide-react';

interface InventoryMetrics {
  totalSKUs: number;
  lowStockSKUs: number;
  overstockedSKUs: number;
  totalOnHand: number;
  totalCommitted: number;
  totalUnfulfillable: number;
  averageDOH: number;
}

interface SKUData {
  product_sku: string;
  product_name: string;
  brand_name: string;
  onhand_quantity: number;
  committed_quantity: number;
  unfulfillable_quantity: number;
  daysOnHand: number;
  status: 'critical' | 'low' | 'healthy' | 'overstock';
  estimatedValue: number;
}

export default function Inventory() {
  const [insights, setInsights] = useState<InsightCardType[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [processedSKUs, setProcessedSKUs] = useState<SKUData[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalSKUs: 0,
    lowStockSKUs: 0,
    overstockedSKUs: 0,
    totalOnHand: 0,
    totalCommitted: 0,
    totalUnfulfillable: 0,
    averageDOH: 0
  });
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState<InsightCardType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isConnected, error: connectionError } = useTinybirdConnection();

  useEffect(() => {
    loadInventoryData();
  }, [selectedBrand]);

  const loadInventoryData = async () => {
    try {
      setLoading(true);

      // If not connected to Tinybird, show empty state
      if (!isConnected) {
        setMetrics({
          totalSKUs: 0,
          lowStockSKUs: 0,
          overstockedSKUs: 0,
          totalOnHand: 0,
          totalCommitted: 0,
          totalUnfulfillable: 0,
          averageDOH: 0
        });
        setProcessedSKUs([]);
        setInsights([]);
        setLoading(false);
        return;
      }
      
      const filters = selectedBrand !== 'all' ? { brandId: selectedBrand, limit: 200 } : { limit: 200 };
      const response = await tinybirdService.getInventoryHealth(filters);
      const inventory = response.data;
      setInventoryData(inventory);

      // Process inventory data to calculate SKU-level metrics
      const skuMap = new Map<string, any>();
      
      inventory.forEach(item => {
        const key = item.product_sku;
        if (skuMap.has(key)) {
          const existing = skuMap.get(key);
          existing.onhand_quantity += item.onhand_quantity || 0;
          existing.committed_quantity += item.committed_quantity || 0;
          existing.unfulfillable_quantity += item.unfulfillable_quantity || 0;
        } else {
          skuMap.set(key, { ...item });
        }
      });

      const processedSKUs: SKUData[] = Array.from(skuMap.values()).map(item => {
        // Estimate daily velocity (mock calculation)
        const dailyVelocity = Math.max(1, Math.floor(Math.random() * 10) + 1);
        const daysOnHand = item.onhand_quantity > 0 ? Math.floor(item.onhand_quantity / dailyVelocity) : 0;
        
        // Determine status
        let status: 'critical' | 'low' | 'healthy' | 'overstock' = 'healthy';
        if (daysOnHand < 3) status = 'critical';
        else if (daysOnHand < 7) status = 'low';
        else if (daysOnHand > 60) status = 'overstock';

        // Estimate value (mock price)
        const estimatedPrice = 25 + Math.floor(Math.random() * 75);
        const estimatedValue = item.onhand_quantity * estimatedPrice;

        return {
          product_sku: item.product_sku,
          product_name: item.product_name || `Product ${item.product_sku}`,
          brand_name: item.brand_name || 'Unknown',
          onhand_quantity: item.onhand_quantity || 0,
          committed_quantity: item.committed_quantity || 0,
          unfulfillable_quantity: item.unfulfillable_quantity || 0,
          daysOnHand,
          status,
          estimatedValue
        };
      });

      setProcessedSKUs(processedSKUs);

      // Calculate metrics
      const totalSKUs = processedSKUs.length;
      const lowStockSKUs = processedSKUs.filter(sku => sku.status === 'critical' || sku.status === 'low').length;
      const overstockedSKUs = processedSKUs.filter(sku => sku.status === 'overstock').length;
      const totalOnHand = processedSKUs.reduce((sum, sku) => sum + sku.onhand_quantity, 0);
      const totalCommitted = processedSKUs.reduce((sum, sku) => sum + sku.committed_quantity, 0);
      const totalUnfulfillable = processedSKUs.reduce((sum, sku) => sum + sku.unfulfillable_quantity, 0);
      const averageDOH = totalSKUs > 0 ? processedSKUs.reduce((sum, sku) => sum + sku.daysOnHand, 0) / totalSKUs : 0;

      setMetrics({
        totalSKUs,
        lowStockSKUs,
        overstockedSKUs,
        totalOnHand,
        totalCommitted,
        totalUnfulfillable,
        averageDOH
      });

      // Generate insights using SKUHealthAgent
      const generatedInsights = await openaiService.generateInventoryInsights(inventory);
      setInsights(generatedInsights);

    } catch (error) {
      console.error('Failed to load inventory data:', error);
      // Only show error state, no fallback data
      setInsights([]);
      setProcessedSKUs([]);
      setMetrics({
        totalSKUs: 0,
        lowStockSKUs: 0,
        overstockedSKUs: 0,
        totalOnHand: 0,
        totalCommitted: 0,
        totalUnfulfillable: 0,
        averageDOH: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const brands = ['all', ...Array.from(new Set(processedSKUs.map(sku => sku.brand_name)))];
  
  const filteredSKUs = processedSKUs.filter(sku => 
    sku.product_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sku.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'low': return 'bg-warning text-warning-foreground';
      case 'overstock': return 'bg-info text-info-foreground';
      default: return 'bg-success text-success-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="h-3 w-3" />;
      case 'low': return <TrendingDown className="h-3 w-3" />;
      case 'overstock': return <TrendingUp className="h-3 w-3" />;
      default: return <Package className="h-3 w-3" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory by SKU</h1>
          <p className="text-muted-foreground">Track SKU availability, velocity alignment, and overstock risks</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search SKUs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand === 'all' ? 'All Brands' : brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadInventoryData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalSKUs.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total SKUs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{metrics.lowStockSKUs.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-info" />
              <div>
                <p className="text-2xl font-bold">{metrics.overstockedSKUs.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Overstocked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Box className="h-4 w-4 text-success" />
              <div>
                <p className="text-2xl font-bold">{metrics.averageDOH.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg Days on Hand</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Health Overview</CardTitle>
          <CardDescription>Current stock levels across all warehouses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{metrics.totalOnHand.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">On Hand Units</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-warning">{metrics.totalCommitted.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Committed Units</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-destructive">{metrics.totalUnfulfillable.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Unfulfillable Units</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SKUHealth Agent Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">SKUHealth Agent Analysis</h2>
          <Badge className="bg-success text-success-foreground">
            Real-time Monitoring
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

      {/* SKU Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>SKU Inventory Details</CardTitle>
          <CardDescription>Current stock levels and days on hand by SKU</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">SKU</th>
                  <th className="text-left p-2">Product Name</th>
                  <th className="text-left p-2">On Hand</th>
                  <th className="text-left p-2">Committed</th>
                  <th className="text-left p-2">Days on Hand</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Est. Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredSKUs.slice(0, 20).map((sku) => (
                  <tr key={sku.product_sku} className="border-b">
                    <td className="p-2 font-mono text-xs">{sku.product_sku}</td>
                    <td className="p-2">{sku.product_name}</td>
                    <td className="p-2 font-medium">{sku.onhand_quantity.toLocaleString()}</td>
                    <td className="p-2">{sku.committed_quantity.toLocaleString()}</td>
                    <td className="p-2">
                      <span className={`font-medium ${sku.daysOnHand < 7 ? 'text-destructive' : 'text-foreground'}`}>
                        {sku.daysOnHand} days
                      </span>
                    </td>
                    <td className="p-2">
                      <Badge className={getStatusColor(sku.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(sku.status)}
                          <span>{sku.status}</span>
                        </div>
                      </Badge>
                    </td>
                    <td className="p-2">${sku.estimatedValue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredSKUs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No SKUs found matching your search criteria.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
