import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, ArrowRight } from 'lucide-react';

export default function Returns() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Return Trends</h1>
          <p className="text-muted-foreground">Monitor return rates, root causes, and processing SLAs</p>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <RotateCcw className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Returns Trends Page</h3>
              <p className="text-muted-foreground max-w-md">
                This page will display return rate analysis by SKU/channel, return reason clustering, 
                unbilled fee detection, and insights from the ReturnsInsightAgent.
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
