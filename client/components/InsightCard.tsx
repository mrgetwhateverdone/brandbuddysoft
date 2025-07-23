import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertTriangle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";
import type { InsightCard as InsightCardType } from "@/lib/openai";

interface InsightCardProps {
  insight: InsightCardType;
  onAction?: (action: string) => void;
  onViewDetails?: () => void;
}

const severityConfig = {
  critical: {
    color: "bg-destructive text-destructive-foreground",
    icon: AlertTriangle,
    iconColor: "text-destructive",
  },
  high: {
    color: "bg-warning text-warning-foreground",
    icon: TrendingDown,
    iconColor: "text-warning",
  },
  medium: {
    color: "bg-info text-info-foreground",
    icon: Info,
    iconColor: "text-info",
  },
  low: {
    color: "bg-muted text-muted-foreground",
    icon: TrendingUp,
    iconColor: "text-muted-foreground",
  },
};

export function InsightCard({
  insight,
  onAction,
  onViewDetails,
}: InsightCardProps) {
  const config = severityConfig[insight.severity];
  const Icon = config.icon;

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onViewDetails?.()}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <Icon className={cn("h-4 w-4", config.iconColor)} />
            <Badge className={config.color}>
              {insight.severity.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center space-x-1 text-sm font-medium">
            <DollarSign className="h-3 w-3" />
            <span>{Math.abs(insight.financialImpact).toLocaleString()}</span>
          </div>
        </div>
        <CardTitle className="text-lg leading-tight">{insight.title}</CardTitle>
        <CardDescription className="text-sm">
          {insight.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Why it matters:</p>
          <p className="text-sm text-muted-foreground">{insight.rootCause}</p>
        </div>

        {insight.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {insight.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {insight.suggestedActions.slice(0, 2).map((action, index) => (
            <Button
              key={index}
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onAction?.(action);
              }}
              className="text-xs"
            >
              {action}
            </Button>
          ))}
          {onViewDetails && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
              className="text-xs"
            >
              View Details
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>by {insight.agentName}</span>
          <span>{Math.round(insight.confidence * 100)}% confidence</span>
        </div>
      </CardContent>
    </Card>
  );
}
