import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Home,
  Package,
  RotateCcw,
  Box,
  AlertTriangle,
  Clock,
  FileText,
  User,
  BarChart3,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/', icon: Home },
  { name: 'Orders by Channel', href: '/orders', icon: Package },
  { name: 'Inbound Shipments', href: '/inbound-shipments', icon: RotateCcw },
  { name: 'Inventory by SKU', href: '/inventory', icon: Box },
  { name: 'Replenishment Alerts', href: '/replenishment', icon: AlertTriangle },
  { name: 'SLA Performance', href: '/sla', icon: Clock },
  { name: 'Workflows & Follow-ups', href: '/workflows', icon: FileText },
  { name: 'Settings', href: '/settings', icon: User },
];

export function Sidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "flex h-screen flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-16 items-center border-b border-sidebar-border relative">
        <div className={cn(
          "flex items-center transition-all duration-300",
          isCollapsed ? "px-4" : "px-6"
        )}>
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <h1 className="ml-2 text-xl font-bold text-sidebar-foreground">BrandBuddy</h1>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center hover:bg-sidebar-accent transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-sidebar-foreground" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-sidebar-foreground" />
          )}
        </button>
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
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors relative group",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className={cn("h-4 w-4", isCollapsed ? "mx-auto" : "mr-3")} />
                {!isCollapsed && <span>{item.name}</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-sidebar-accent text-sidebar-accent-foreground text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-4">
        <div className={cn(
          "flex items-center text-xs text-sidebar-foreground/60",
          isCollapsed ? "justify-center" : "space-x-2"
        )} title={isCollapsed ? "Connected to Tinybird" : undefined}>
          <Activity className="h-3 w-3" />
          {!isCollapsed && <span>Connected to Tinybird</span>}
        </div>
      </div>
    </div>
  );
}
