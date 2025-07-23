import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function Replenishment() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Replenishment Alerts</h1>
          <p className="text-muted-foreground">Forecast-driven risk detection for stockouts and supply chain lag</p>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Replenishment Alerts Page</h3>
              <p className="text-muted-foreground max-w-md">
                Demand-velocity prediction, open PO status, forecast vs actual analysis, 
                and insights from the ReplenishmentAgent.
              </p>
            </div>
            <Button className="mt-4">
              Continue prompting to build this page
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
