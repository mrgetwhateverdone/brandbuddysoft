import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Activity,
  Zap,
  FileText,
  Database
} from 'lucide-react';
import type { InsightCard as InsightCardType } from '@/lib/openai';

interface InsightDetailModalProps {
  insight: InsightCardType | null;
  isOpen: boolean;
  onClose: () => void;
  onCheckConnection: () => void;
  onTryAgain: () => void;
  onAddToWorkflow: (insight: InsightCardType) => void;
}

export function InsightDetailModal({ 
  insight, 
  isOpen, 
  onClose, 
  onCheckConnection, 
  onTryAgain, 
  onAddToWorkflow 
}: InsightDetailModalProps) {
  const [isAddingToWorkflow, setIsAddingToWorkflow] = useState(false);

  if (!insight) return null;

  const handleAddToWorkflow = async () => {
    setIsAddingToWorkflow(true);
    try {
      await onAddToWorkflow(insight);
    } finally {
      setIsAddingToWorkflow(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'high': return <TrendingUp className="h-5 w-5 text-warning" />;
      case 'medium': return <Clock className="h-5 w-5 text-info" />;
      default: return <CheckCircle className="h-5 w-5 text-muted-foreground" />;
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

  const confidencePercentage = Math.round(insight.confidence * 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {getSeverityIcon(insight.severity)}
            <span>Decision Engine Analysis</span>
          </DialogTitle>
          <DialogDescription>
            Detailed insight analysis with recommended actions and reasoning trail
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="reasoning">AI Reasoning</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            {/* Insight Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{insight.title}</CardTitle>
                  <Badge className={getSeverityColor(insight.severity)}>
                    {insight.severity.toUpperCase()}
                  </Badge>
                </div>
                <CardDescription className="text-base">
                  {insight.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Financial Impact */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="font-medium">Financial Impact</span>
                  </div>
                  <span className="text-2xl font-bold">
                    ${Math.abs(insight.financialImpact).toLocaleString()}
                  </span>
                </div>

                {/* Confidence Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">AI Confidence Score</span>
                    <span className="text-sm font-medium">{confidencePercentage}%</span>
                  </div>
                  <Progress value={confidencePercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Based on data quality, pattern strength, and historical accuracy
                  </p>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <span className="font-medium">Related Tags</span>
                  <div className="flex flex-wrap gap-2">
                    {insight.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Timeframe */}
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Generated by {insight.agentName}</span>
                  <span>•</span>
                  <span>Real-time analysis</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reasoning" className="space-y-4">
            {/* Agent Reasoning Trail */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Agent Reasoning Trail</span>
                </CardTitle>
                <CardDescription>
                  How {insight.agentName} analyzed the data to surface this insight
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-medium">Root Cause Analysis</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {insight.rootCause}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="border-l-4 border-info pl-4">
                    <h4 className="font-medium">Why This Matters</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      This operational decision impacts ${insight.financialImpact.toLocaleString()} in potential revenue and requires immediate workflow automation to prevent escalation.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="border-l-4 border-success pl-4">
                    <h4 className="font-medium">Recommended Decision</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Based on data patterns and operational constraints, the decision engine recommends creating an automated workflow to address this issue efficiently.
                    </p>
                  </div>
                </div>

                {/* Supporting Metrics */}
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Supporting Data Points</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Historical pattern analysis from similar scenarios</li>
                    <li>• Real-time operational data validation</li>
                    <li>• Impact assessment based on business rules</li>
                    <li>• Confidence scoring from data quality metrics</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evidence" className="space-y-4">
            {/* Evidence Trail */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Evidence Trail</span>
                </CardTitle>
                <CardDescription>
                  Data sources and metrics supporting this decision
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insight.evidenceTrail && insight.evidenceTrail.length > 0 ? (
                  <div className="space-y-3">
                    {insight.evidenceTrail.slice(0, 5).map((evidence, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-muted/20">
                        <pre className="text-xs text-muted-foreground overflow-x-auto">
                          {JSON.stringify(evidence, null, 2)}
                        </pre>
                      </div>
                    ))}
                    {insight.evidenceTrail.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{insight.evidenceTrail.length - 5} more data points analyzed
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Evidence data processed and analyzed</p>
                    <p className="text-xs">Raw data trail available in audit logs</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            {/* Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Recommended Actions</span>
                </CardTitle>
                <CardDescription>
                  Immediate steps to address this operational decision
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {insight.suggestedActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start h-auto p-4"
                      onClick={() => console.log('Action:', action)}
                    >
                      <div className="text-left">
                        <div className="font-medium">{action}</div>
                        <div className="text-sm text-muted-foreground">
                          Execute this workflow action
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
                
                <Separator />
                
                {/* System Actions */}
                <div className="space-y-3">
                  <h4 className="font-medium">System Actions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Button variant="outline" onClick={onCheckConnection}>
                      <Database className="mr-2 h-4 w-4" />
                      Check API Connection
                    </Button>
                    <Button variant="outline" onClick={onTryAgain}>
                      <Activity className="mr-2 h-4 w-4" />
                      Try Again Later
                    </Button>
                    <Button 
                      onClick={handleAddToWorkflow}
                      disabled={isAddingToWorkflow}
                      className="bg-primary text-primary-foreground"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      {isAddingToWorkflow ? 'Adding...' : 'Add to Workflows'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
