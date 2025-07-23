import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Box, ArrowRight } from 'lucide-react';

export default function Inventory() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory by SKU</h1>
          <p className="text-muted-foreground">Track SKU availability, velocity alignment, and overstock risks</p>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-8">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Box className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Inventory by SKU Page</h3>
              <p className="text-muted-foreground max-w-md">
                Days on hand tracking, reorder threshold alerts, overstock detection, 
                and insights from the SKUHealthAgent.
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
