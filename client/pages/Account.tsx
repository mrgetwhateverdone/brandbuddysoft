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
import { InsightCard } from '@/components/InsightCard';
import { openaiService, type InsightCard as InsightCardType } from '@/lib/openai';
import { tinybirdService } from '@/lib/tinybird';
import { 
  User, 
  Bell, 
  Shield, 
  HelpCircle, 
  Settings, 
  Activity, 
  Mail, 
  Slack, 
  Clock,
  BarChart3,
  CheckCircle,
  AlertTriangle
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
  slack: {
    enabled: boolean;
    webhook: string;
    criticalOnly: boolean;
    channelOverride: string;
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

export default function Account() {
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
    slack: {
      enabled: false,
      webhook: '',
      criticalOnly: true,
      channelOverride: ''
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

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccountData();
  }, []);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      
      // Check connection status
      const [tinybirdResult, openaiResult] = await Promise.all([
        tinybirdService.testConnection(),
        openaiService.testConnection()
      ]);
      
      setConnectionStatus({
        tinybird: tinybirdResult.success,
        openai: openaiResult.success,
        lastSync: new Date().toISOString()
      });

      // Generate insights using ExperienceTunerAgent simulation
      const experienceInsights = await generateExperienceInsights();
      setInsights(experienceInsights);

    } catch (error) {
      console.error('Failed to load account data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateExperienceInsights = async (): Promise<InsightCardType[]> => {
    // Simulate ExperienceTunerAgent providing UX recommendations
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
      // Simulate API call to save settings
      console.log('Saving settings:', { notificationSettings, userPreferences });
      // In real implementation, would call backend API
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const testConnection = async (service: 'tinybird' | 'openai') => {
    try {
      if (service === 'tinybird') {
        const result = await tinybirdService.testConnection();
        setConnectionStatus(prev => ({ ...prev, tinybird: result.success }));
      } else {
        const result = await openaiService.testConnection();
        setConnectionStatus(prev => ({ ...prev, openai: result.success }));
      }
    } catch (error) {
      console.error(`Failed to test ${service} connection:`, error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Slack className="h-5 w-5" />
                <span>Slack Integration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Slack Notifications</Label>
                <Switch
                  checked={notificationSettings.slack.enabled}
                  onCheckedChange={(checked) => setNotificationSettings(prev => ({
                    ...prev,
                    slack: { ...prev.slack, enabled: checked }
                  }))}
                />
              </div>
              {notificationSettings.slack.enabled && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      placeholder="https://hooks.slack.com/services/..."
                      value={notificationSettings.slack.webhook}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        slack: { ...prev.slack, webhook: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Critical Alerts Only</Label>
                    <Switch
                      checked={notificationSettings.slack.criticalOnly}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({
                        ...prev,
                        slack: { ...prev.slack, criticalOnly: checked }
                      }))}
                    />
                  </div>
                </div>
              )}
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
                    <Button size="sm" variant="outline" onClick={() => testConnection('tinybird')}>
                      Test
                    </Button>
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
                    <Button size="sm" variant="outline" onClick={() => testConnection('openai')}>
                      Test
                    </Button>
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
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Documentation</div>
                    <div className="text-sm text-muted-foreground">User guides and API docs</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Contact Support</div>
                    <div className="text-sm text-muted-foreground">Get help from our team</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
                  <div className="text-left">
                    <div className="font-medium">Feature Requests</div>
                    <div className="text-sm text-muted-foreground">Suggest improvements</div>
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto p-4">
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
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">156</div>
                  <div className="text-sm text-muted-foreground">Total Insights</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">23</div>
                  <div className="text-sm text-muted-foreground">Active Workflows</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">97.2%</div>
                  <div className="text-sm text-muted-foreground">System Uptime</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
