import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Package, 
  RotateCcw, 
  Box, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Plus, 
  User,
  BarChart3,
  Activity
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/', icon: Home },
  { name: 'Orders by Channel', href: '/orders', icon: Package },
  { name: 'Inbound Shipments', href: '/inbound-shipments', icon: RotateCcw },
  { name: 'Inventory by SKU', href: '/inventory', icon: Box },
  { name: 'Replenishment Alerts', href: '/replenishment', icon: AlertTriangle },
  { name: 'SLA Performance', href: '/sla', icon: Clock },
  { name: 'Workflows & Follow-ups', href: '/workflows', icon: FileText },
  { name: 'Account', href: '/account', icon: User },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-sidebar-foreground">BrandBuddy</h1>
        </div>
      </div>
      
      <div className="flex-1 px-4 py-6">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center space-x-2 text-xs text-sidebar-foreground/60">
          <Activity className="h-3 w-3" />
          <span>Connected to Tinybird</span>
        </div>
      </div>
    </div>
  );
}
