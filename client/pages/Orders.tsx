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
  Package,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Truck,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface OrderMetrics {
  totalOrders: number;
  fulfilledOrders: number;
  canceledOrders: number;
  lateOrders: number;
  channelBreakdown: Record<string, number>;
  cancelRate: number;
}

export default function Orders() {
  const [insights, setInsights] = useState<InsightCardType[]>([]);
  const [orderData, setOrderData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<OrderMetrics>({
    totalOrders: 0,
    fulfilledOrders: 0,
    canceledOrders: 0,
    lateOrders: 0,
    channelBreakdown: {},
    cancelRate: 0,
  });
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] =
    useState<InsightCardType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isConnected, error: connectionError } = useTinybirdConnection();

  useEffect(() => {
    loadOrdersData();
  }, [selectedChannel]);

  const loadOrdersData = async () => {
    try {
      setLoading(true);

      // If not connected to Tinybird, show empty state
      if (!isConnected) {
        setMetrics({
          totalOrders: 0,
          fulfilledOrders: 0,
          canceledOrders: 0,
          lateOrders: 0,
          channelBreakdown: {},
          cancelRate: 0,
        });
        setOrderData([]);
        setInsights([]);
        setLoading(false);
        return;
      }

      const filters =
        selectedChannel !== "all"
          ? { channel: selectedChannel, limit: 100 }
          : { limit: 100 };
      const response = await tinybirdService.getOrderDetails(filters);
      const orders = response.data;
      setOrderData(orders);

      // Calculate metrics
      const totalOrders = orders.length;
      const fulfilledOrders = orders.filter(
        (o) => o.order_status === "fulfilled",
      ).length;
      const canceledOrders = orders.filter(
        (o) => o.order_status === "canceled" || o.order_status === "cancelled",
      ).length;
      const lateOrders = orders.filter((o) => {
        const created = new Date(o.created_date);
        const now = new Date();
        const daysDiff =
          (now.getTime() - created.getTime()) / (1000 * 3600 * 24);
        return daysDiff > 3 && o.order_status !== "fulfilled";
      }).length;

      const channelBreakdown = orders.reduce(
        (acc: Record<string, number>, order) => {
          acc[order.channel] = (acc[order.channel] || 0) + 1;
          return acc;
        },
        {},
      );

      const cancelRate =
        totalOrders > 0 ? (canceledOrders / totalOrders) * 100 : 0;

      setMetrics({
        totalOrders,
        fulfilledOrders,
        canceledOrders,
        lateOrders,
        channelBreakdown,
        cancelRate,
      });

      // Generate insights using OrderFlowAgent
      const generatedInsights =
        await openaiService.generateOrderFlowInsights(orders);
      setInsights(generatedInsights);
    } catch (error) {
      console.error("Failed to load orders data:", error);
      // Only show error state, no fallback data
      setInsights([]);
      setOrderData([]);
      setMetrics({
        totalOrders: 0,
        fulfilledOrders: 0,
        canceledOrders: 0,
        lateOrders: 0,
        channelBreakdown: {},
        cancelRate: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const channels = ["all", ...Object.keys(metrics.channelBreakdown)];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Orders by Channel
          </h1>
          <p className="text-muted-foreground">
            Monitor fulfillment performance and detect channel anomalies
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((channel) => (
                <SelectItem key={channel} value={channel}>
                  {channel === "all" ? "All Channels" : channel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadOrdersData} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics.totalOrders.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-success" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics.fulfilledOrders.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Fulfilled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics.canceledOrders.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Canceled ({metrics.cancelRate.toFixed(1)}%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics.lateOrders.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Late Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
          <CardDescription>
            Order volume and performance by sales channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(metrics.channelBreakdown).map(
              ([channel, count]) => (
                <div key={channel} className="text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{channel}</p>
                  <div className="mt-2">
                    <Badge variant="outline">
                      {((count / metrics.totalOrders) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      {/* OrderFlow Agent Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">OrderFlow Agent Insights</h2>
          <Badge className="bg-info text-info-foreground">
            Real-time Channel Monitoring
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
                onAction={(action) => console.log("Action:", action)}
                onViewDetails={() => {
                  setSelectedInsight(insight);
                  setIsModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>
            Latest order activity across all channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Order ID</th>
                  <th className="text-left p-2">Channel</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Total</th>
                  <th className="text-left p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {orderData.slice(0, 10).map((order) => (
                  <tr key={order.order_id} className="border-b">
                    <td className="p-2 font-mono text-xs">
                      {order.order_number || order.order_id}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">{order.channel}</Badge>
                    </td>
                    <td className="p-2">
                      <Badge
                        className={
                          order.order_status === "fulfilled"
                            ? "bg-success text-success-foreground"
                            : order.order_status === "canceled"
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {order.order_status}
                      </Badge>
                    </td>
                    <td className="p-2">
                      ${order.total_price?.toFixed(2) || "0.00"}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {new Date(order.order_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                <p className="text-sm text-muted-foreground">
                  Connect to Tinybird in Settings to view real orders data.
                </p>
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
        onCheckConnection={() => console.log("Check connection")}
        onTryAgain={() => loadOrdersData()}
        onAddToWorkflow={(insight) => console.log("Add to workflow:", insight)}
      />
    </div>
  );
}
