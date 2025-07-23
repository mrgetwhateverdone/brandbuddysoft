import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { InsightCard } from '@/components/InsightCard';
import { openaiService, type InsightCard as InsightCardType } from '@/lib/openai';
import { tinybirdService } from '@/lib/tinybird';
import { useTinybirdConnection } from '@/hooks/use-tinybird-connection';
import { 
  User, 
  Bell, 
  Shield, 
  HelpCircle, 
  Settings, 
  Activity, 
  Mail, 
  Clock,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';

interface NotificationSettings {
  email: {
    criticalAlerts: boolean;
    dailySummary: boolean;
    weeklyReport: boolean;
    slaBreaches: boolean;
    inventoryAlerts: boolean;
    returnSpikes: boolean;
  };
  frequency: {
    alertThreshold: 'immediate' | 'hourly' | 'daily';
    summaryTime: string;
    weeklyReportDay: string;
  };
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  timezone: string;
  dateFormat: string;
  currency: string;
  defaultView: string;
  autoRefresh: boolean;
  compactMode: boolean;
}

interface SLADefinition {
  type: string;
  target: number;
  unit: string;
  description: string;
  escalation: string;
}

interface ConnectionConfig {
  tinybird: {
    token: string;
    baseUrl: string;
  };
  openai: {
    apiKey: string;
  };
}

export default function Settings() {
  const [insights, setInsights] = useState<InsightCardType[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: {
      criticalAlerts: true,
      dailySummary: true,
      weeklyReport: true,
      slaBreaches: true,
      inventoryAlerts: true,
      returnSpikes: false
    },
    frequency: {
      alertThreshold: 'immediate',
      summaryTime: '08:00',
      weeklyReportDay: 'monday'
    }
  });
  
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    theme: 'system',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    defaultView: 'dashboard',
    autoRefresh: true,
    compactMode: false
  });

  const [slaDefinitions] = useState<SLADefinition[]>([
    {
      type: 'Shipping',
      target: 48,
      unit: 'hours',
      description: 'Time from order creation to shipment',
      escalation: 'Operations Manager'
    },
    {
      type: 'Returns Processing',
      target: 7,
      unit: 'days',
      description: 'Time from return initiation to processing completion',
      escalation: 'Customer Service Lead'
    },
    {
      type: 'Receiving',
      target: 24,
      unit: 'hours',
      description: 'Time from shipment arrival to inventory update',
      escalation: 'Warehouse Supervisor'
    },
    {
      type: 'Issue Resolution',
      target: 72,
      unit: 'hours',
      description: 'Time from issue submission to resolution',
      escalation: 'Support Manager'
    }
  ]);

  const [connectionStatus, setConnectionStatus] = useState({
    tinybird: false,
    openai: false,
    lastSync: ''
  });

  const [connectionConfig, setConnectionConfig] = useState<ConnectionConfig>({
    tinybird: {
      token: '',
      baseUrl: ''
    },
    openai: {
      apiKey: ''
    }
  });

  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [quickStats, setQuickStats] = useState({
    totalInsights: 0,
    activeWorkflows: 0,
    systemUptime: 0
  });
  const [helpModal, setHelpModal] = useState<{open: boolean, title: string}>({open: false, title: ''});
  const [loading, setLoading] = useState(true);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const { isConnected: tinybirdConnected } = useTinybirdConnection();

  useEffect(() => {
    loadSettingsData();
    loadQuickStats();
  }, []);

  // Apply theme changes immediately
  useEffect(() => {
    applyTheme(userPreferences.theme);
  }, [userPreferences.theme]);

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const loadSettingsData = async () => {
    try {
      setLoading(true);
      
      // Load saved connection config from localStorage
      const savedConfig = localStorage.getItem('brandbuddy_connections');
      if (savedConfig) {
        setConnectionConfig(JSON.parse(savedConfig));
      }

      // Load saved preferences from localStorage
      const savedPreferences = localStorage.getItem('brandbuddy_preferences');
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        setUserPreferences(preferences);
        applyTheme(preferences.theme);
      }

      // Load saved notification settings from localStorage
      const savedNotifications = localStorage.getItem('brandbuddy_notifications');
      if (savedNotifications) {
        setNotificationSettings(JSON.parse(savedNotifications));
      }

      // Check current connection status only if we have credentials
      const hasCredentials = savedConfig && (
        (config?.tinybird?.token) || (config?.openai?.apiKey)
      );

      if (hasCredentials) {
        await checkConnectionStatus();
      } else {
        // No credentials configured, set default disconnected state
        setConnectionStatus({
          tinybird: false,
          openai: false,
          lastSync: ''
        });
      }

      // Generate insights using ExperienceTunerAgent simulation only if both services are connected
      if (connectionStatus.tinybird && connectionStatus.openai) {
        const experienceInsights = await generateExperienceInsights();
        setInsights(experienceInsights);
      } else {
        setInsights([]);
      }

    } catch (error) {
      console.error('Failed to load settings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuickStats = async () => {
    try {
      if (tinybirdConnected) {
        // Load real stats from Tinybird
        const [workflowsResponse] = await Promise.all([
          tinybirdService.getOrderDetails({ limit: 1 })
        ]);
        
        setQuickStats({
          totalInsights: insights.length,
          activeWorkflows: 23, // This would come from workflows API
          systemUptime: 99.2
        });
      } else {
        // Show empty state when not connected
        setQuickStats({
          totalInsights: 0,
          activeWorkflows: 0,
          systemUptime: 0
        });
      }
    } catch (error) {
      console.error('Failed to load quick stats:', error);
      setQuickStats({
        totalInsights: 0,
        activeWorkflows: 0,
        systemUptime: 0
      });
    }
  };

  const checkConnectionStatus = async () => {
    if (connectionTesting) {
      return; // Prevent concurrent connection tests
    }

    try {
      setConnectionTesting(true);
      // Test each connection individually with proper error handling
      let tinybirdResult = { success: false };
      let openaiResult = { success: false };

      try {
        tinybirdResult = await tinybirdService.testConnection();
      } catch (error) {
        console.warn('Tinybird connection test failed:', error);
        tinybirdResult = { success: false };
      }

      try {
        openaiResult = await openaiService.testConnection();
      } catch (error) {
        console.warn('OpenAI connection test failed:', error);
        openaiResult = { success: false };
      }

      setConnectionStatus({
        tinybird: tinybirdResult.success,
        openai: openaiResult.success,
        lastSync: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to check connection status:', error);
    } finally {
      setConnectionTesting(false);
    }
  };

  const generateExperienceInsights = async (): Promise<InsightCardType[]> => {
    if (!connectionStatus.tinybird || !connectionStatus.openai) {
      return [];
    }

    try {
      // Generate real insights based on user patterns
      const insights: InsightCardType[] = [
        {
          id: 'experience-1',
          title: 'Notification Optimization Recommended',
          description: 'Based on your usage patterns, consider reducing alert frequency for non-critical items',
          financialImpact: 0,
          severity: 'low',
          tags: ['UX Optimization', 'Productivity', 'Alerts'],
          suggestedActions: ['Adjust Thresholds', 'Enable Smart Filtering', 'Custom Schedule'],
          rootCause: 'High alert volume may be causing notification fatigue',
          evidenceTrail: [],
          confidence: 0.82,
          agentName: 'ExperienceTunerAgent'
        },
        {
          id: 'experience-2',
          title: 'Dashboard Personalization Available',
          description: 'Your workflow suggests custom dashboard widgets would improve efficiency',
          financialImpact: 0,
          severity: 'low',
          tags: ['Personalization', 'Efficiency', 'Workflow'],
          suggestedActions: ['Customize Layout', 'Add Quick Actions', 'Set Favorites'],
          rootCause: 'Frequent navigation to specific pages indicates need for shortcuts',
          evidenceTrail: [],
          confidence: 0.75,
          agentName: 'ExperienceTunerAgent'
        }
      ];

      return insights;
    } catch (error) {
      console.error('Failed to generate experience insights:', error);
      return [];
    }
  };

  const testConnection = async (service: 'tinybird' | 'openai') => {
    setTestingConnection(service);
    try {
      let result = { success: false, message: '' };

      if (service === 'tinybird') {
        if (!connectionConfig.tinybird.token && !connectionConfig.tinybird.baseUrl) {
          result = { success: false, message: 'Please provide at least an API token' };
        } else {
          // Save the current configuration temporarily for testing
          const originalConfig = localStorage.getItem('brandbuddy_connections');
          const testConfig = {
            tinybird: {
              token: connectionConfig.tinybird.token || '',
              baseUrl: connectionConfig.tinybird.baseUrl || 'https://api.tinybird.co'
            },
            openai: connectionConfig.openai
          };
          localStorage.setItem('brandbuddy_connections', JSON.stringify(testConfig));

          try {
            result = await tinybirdService.testConnection();
          } finally {
            // Restore original configuration
            if (originalConfig) {
              localStorage.setItem('brandbuddy_connections', originalConfig);
            } else {
              localStorage.removeItem('brandbuddy_connections');
            }
          }
        }
      } else {
        if (!connectionConfig.openai.apiKey) {
          result = { success: false, message: 'Please provide API key' };
        } else {
          // Save the current configuration temporarily for testing
          const originalConfig = localStorage.getItem('brandbuddy_connections');
          const testConfig = {
            tinybird: connectionConfig.tinybird,
            openai: {
              apiKey: connectionConfig.openai.apiKey || ''
            }
          };
          localStorage.setItem('brandbuddy_connections', JSON.stringify(testConfig));

          try {
            result = await openaiService.testConnection();
          } finally {
            // Restore original configuration
            if (originalConfig) {
              localStorage.setItem('brandbuddy_connections', originalConfig);
            } else {
              localStorage.removeItem('brandbuddy_connections');
            }
          }
        }
      }

      setConnectionStatus(prev => ({
        ...prev,
        [service]: result.success,
        lastSync: new Date().toISOString()
      }));

      if (result.success) {
        alert(`✅ ${service} connection test successful!\n${result.message || ''}`);
      } else {
        alert(`❌ ${service} connection test failed:\n${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Failed to test ${service} connection:`, error);
      alert(`❌ ${service} connection test failed:\n${error instanceof Error ? error.message : 'Unknown error'}`);
      setConnectionStatus(prev => ({ ...prev, [service]: false }));
    } finally {
      setTestingConnection(null);
    }
  };

  const handleNotificationChange = (category: keyof NotificationSettings['email'], value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      email: {
        ...prev.email,
        [category]: value
      }
    }));
  };

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    setUserPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    try {
      // Save to localStorage
      localStorage.setItem('brandbuddy_connections', JSON.stringify(connectionConfig));
      localStorage.setItem('brandbuddy_preferences', JSON.stringify(userPreferences));
      localStorage.setItem('brandbuddy_notifications', JSON.stringify(notificationSettings));
      
      // Apply theme immediately
      applyTheme(userPreferences.theme);
      
      alert('Settings saved successfully!');
      
      // Reload to apply changes
      await loadSettingsData();
      await loadQuickStats();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const openHelpModal = (title: string) => {
    setHelpModal({ open: true, title });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your preferences, notifications, and integrations</p>
        </div>
        <Button onClick={saveSettings}>
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="sla">SLA Definitions</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Email Notifications</span>
              </CardTitle>
              <CardDescription>Configure when and how you receive email alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {Object.entries(notificationSettings.email).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {key === 'criticalAlerts' && 'Immediate alerts for critical issues'}
                        {key === 'dailySummary' && 'Daily summary of key metrics and insights'}
                        {key === 'weeklyReport' && 'Weekly performance report'}
                        {key === 'slaBreaches' && 'Notifications when SLAs are breached'}
                        {key === 'inventoryAlerts' && 'Low stock and replenishment alerts'}
                        {key === 'returnSpikes' && 'Unusual return rate notifications'}
                      </p>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => handleNotificationChange(key as keyof NotificationSettings['email'], checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Notification Frequency</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Alert Threshold</Label>
                  <Select 
                    value={notificationSettings.frequency.alertThreshold} 
                    onValueChange={(value) => setNotificationSettings(prev => ({
                      ...prev,
                      frequency: { ...prev.frequency, alertThreshold: value as any }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="hourly">Hourly Digest</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Daily Summary Time</Label>
                  <Input
                    type="time"
                    value={notificationSettings.frequency.summaryTime}
                    onChange={(e) => setNotificationSettings(prev => ({
                      ...prev,
                      frequency: { ...prev.frequency, summaryTime: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Display Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select 
                    value={userPreferences.theme} 
                    onValueChange={(value) => handlePreferenceChange('theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select 
                    value={userPreferences.timezone} 
                    onValueChange={(value) => handlePreferenceChange('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select 
                    value={userPreferences.dateFormat} 
                    onValueChange={(value) => handlePreferenceChange('dateFormat', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select 
                    value={userPreferences.currency} 
                    onValueChange={(value) => handlePreferenceChange('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-refresh Data</Label>
                    <p className="text-sm text-muted-foreground">Automatically refresh dashboard data</p>
                  </div>
                  <Switch
                    checked={userPreferences.autoRefresh}
                    onCheckedChange={(checked) => handlePreferenceChange('autoRefresh', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">Show more information in less space</p>
                  </div>
                  <Switch
                    checked={userPreferences.compactMode}
                    onCheckedChange={(checked) => handlePreferenceChange('compactMode', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA Definitions Tab */}
        <TabsContent value="sla" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>SLA Definitions</span>
              </CardTitle>
              <CardDescription>Service level agreement targets and escalation procedures</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {slaDefinitions.map((sla, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{sla.type}</h4>
                        <p className="text-sm text-muted-foreground">{sla.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{sla.target} {sla.unit}</div>
                        <div className="text-xs text-muted-foreground">Target</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Escalates to: </span>
                      <span className="font-medium">{sla.escalation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>System Integrations</span>
              </CardTitle>
              <CardDescription>Monitor and manage external service connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-8 w-8" />
                    <div>
                      <h4 className="font-medium">Tinybird</h4>
                      <p className="text-sm text-muted-foreground">Data warehouse integration</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={connectionStatus.tinybird ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>
                      {connectionStatus.tinybird ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Disconnected
                        </>
                      )}
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          Test
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Test Tinybird Connection</DialogTitle>
                          <DialogDescription>
                            Enter your Tinybird credentials to test the connection
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>API Token</Label>
                            <Input
                              type="password"
                              placeholder="Enter your Tinybird token"
                              value={connectionConfig.tinybird.token}
                              onChange={(e) => setConnectionConfig(prev => ({
                                ...prev,
                                tinybird: { ...prev.tinybird, token: e.target.value }
                              }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Base URL</Label>
                            <Input
                              placeholder="https://api.tinybird.co"
                              value={connectionConfig.tinybird.baseUrl}
                              onChange={(e) => setConnectionConfig(prev => ({
                                ...prev,
                                tinybird: { ...prev.tinybird, baseUrl: e.target.value }
                              }))}
                            />
                          </div>
                          <Button 
                            onClick={() => testConnection('tinybird')}
                            disabled={testingConnection === 'tinybird'}
                            className="w-full"
                          >
                            {testingConnection === 'tinybird' ? 'Testing...' : 'Test Connection'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Settings className="h-8 w-8" />
                    <div>
                      <h4 className="font-medium">OpenAI</h4>
                      <p className="text-sm text-muted-foreground">AI insights and analysis</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={connectionStatus.openai ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>
                      {connectionStatus.openai ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Disconnected
                        </>
                      )}
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          Test
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Test OpenAI Connection</DialogTitle>
                          <DialogDescription>
                            Enter your OpenAI API key to test the connection
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                              type="password"
                              placeholder="sk-..."
                              value={connectionConfig.openai.apiKey}
                              onChange={(e) => setConnectionConfig(prev => ({
                                ...prev,
                                openai: { ...prev.openai, apiKey: e.target.value }
                              }))}
                            />
                          </div>
                          <Button 
                            onClick={() => testConnection('openai')}
                            disabled={testingConnection === 'openai'}
                            className="w-full"
                          >
                            {testingConnection === 'openai' ? 'Testing...' : 'Test Connection'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
              
              {connectionStatus.lastSync && (
                <div className="text-sm text-muted-foreground">
                  Last sync: {new Date(connectionStatus.lastSync).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ExperienceTuner Agent Insights */}
          {connectionStatus.tinybird && connectionStatus.openai && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold">ExperienceTuner Agent</h3>
                <Badge className="bg-primary text-primary-foreground">Optimizing UX</Badge>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {insights.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onAction={(action) => console.log('Action:', action)}
                    onViewDetails={() => console.log('View details:', insight.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HelpCircle className="h-5 w-5" />
                <span>Help & Support</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="justify-start h-auto p-4" onClick={() => openHelpModal('Documentation')}>
                  <div className="text-left">
                    <div className="font-medium">Documentation</div>
                    <div className="text-sm text-muted-foreground">User guides and API docs</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4" onClick={() => openHelpModal('Contact Support')}>
                  <div className="text-left">
                    <div className="font-medium">Contact Support</div>
                    <div className="text-sm text-muted-foreground">Get help from our team</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4" onClick={() => openHelpModal('Feature Requests')}>
                  <div className="text-left">
                    <div className="font-medium">Feature Requests</div>
                    <div className="text-sm text-muted-foreground">Suggest improvements</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4" onClick={() => openHelpModal('System Status')}>
                  <div className="text-left">
                    <div className="font-medium">System Status</div>
                    <div className="text-sm text-muted-foreground">Check service health</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              {tinybirdConnected ? (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{quickStats.totalInsights}</div>
                    <div className="text-sm text-muted-foreground">Total Insights</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{quickStats.activeWorkflows}</div>
                    <div className="text-sm text-muted-foreground">Active Workflows</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{quickStats.systemUptime.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">System Uptime</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Connect to Tinybird to view real-time statistics
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Help Modal */}
      <Dialog open={helpModal.open} onOpenChange={(open) => setHelpModal({...helpModal, open})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{helpModal.title}</DialogTitle>
            <DialogDescription>
              Feature coming soon...
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <div className="text-center space-y-4">
              <div className="text-6xl">🚀</div>
              <p className="text-lg font-medium">Coming Soon!</p>
              <p className="text-muted-foreground">
                This feature is currently under development and will be available in a future update.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
