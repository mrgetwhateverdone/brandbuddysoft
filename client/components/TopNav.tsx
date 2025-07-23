import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Bell, X, AlertTriangle, Clock, Package } from 'lucide-react';
import type { InsightCard as InsightCardType } from '@/lib/openai';

interface Alert {
  id: string;
  type: 'inventory' | 'sla' | 'shipment' | 'general';
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  acknowledged: boolean;
  insightId?: string;
  financialImpact?: number;
}

interface TopNavProps {
  alerts: Alert[];
  onAlertClick: (alert: Alert) => void;
  onAlertDismiss: (alertId: string) => void;
  onAddToWorkflow: (alert: Alert) => void;
}

export function TopNav({ alerts, onAlertClick, onAlertDismiss, onAddToWorkflow }: TopNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'inventory': return <Package className="h-4 w-4" />;
      case 'sla': return <Clock className="h-4 w-4" />;
      case 'shipment': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-destructive';
      case 'high': return 'text-warning';
      case 'medium': return 'text-info';
      default: return 'text-muted-foreground';
    }
  };

  const groupedAlerts = alerts.reduce((acc, alert) => {
    const category = alert.acknowledged ? 'acknowledged' : 'new';
    if (!acc[category]) acc[category] = [];
    acc[category].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);

  return (
    <div className="h-16 border-b border-border bg-background px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-semibold">Brand Intelligence Decision Engine</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              {unacknowledgedAlerts.length > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs"
                >
                  {unacknowledgedAlerts.length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-96">
            <SheetHeader>
              <SheetTitle>Real-time Decision Alerts</SheetTitle>
              <SheetDescription>
                AI-generated alerts requiring operational decisions
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-4">
              {/* New Alerts */}
              {groupedAlerts.new && groupedAlerts.new.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span>New Alerts ({groupedAlerts.new.length})</span>
                  </h4>
                  
                  {groupedAlerts.new.map((alert) => (
                    <Card 
                      key={alert.id} 
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => onAlertClick(alert)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-2 flex-1">
                            <div className={getSeverityColor(alert.severity)}>
                              {getAlertIcon(alert.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-sm truncate">{alert.title}</h5>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {alert.description}
                              </p>
                              {alert.financialImpact && (
                                <p className="text-xs font-medium mt-1">
                                  Impact: ${alert.financialImpact.toLocaleString()}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(alert.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAlertDismiss(alert.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-3">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToWorkflow(alert);
                            }}
                          >
                            Add to Workflows
                          </Button>
                          <Badge variant="outline" className="text-xs">
                            {alert.type}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* SLA Alerts Group */}
              {alerts.filter(a => a.type === 'sla').length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-warning">SLA Alerts</h4>
                  {alerts.filter(a => a.type === 'sla').slice(0, 3).map((alert) => (
                    <div key={alert.id} className="text-sm p-2 bg-warning/10 rounded cursor-pointer"
                         onClick={() => onAlertClick(alert)}>
                      {alert.title}
                    </div>
                  ))}
                </div>
              )}

              {/* Inventory Alerts Group */}
              {alerts.filter(a => a.type === 'inventory').length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-info">Inventory Alerts</h4>
                  {alerts.filter(a => a.type === 'inventory').slice(0, 3).map((alert) => (
                    <div key={alert.id} className="text-sm p-2 bg-info/10 rounded cursor-pointer"
                         onClick={() => onAlertClick(alert)}>
                      {alert.title}
                    </div>
                  ))}
                </div>
              )}

              {alerts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No active alerts</p>
                  <p className="text-xs">Decision engine monitoring all systems</p>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
