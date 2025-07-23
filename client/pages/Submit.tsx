import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { InsightCard } from '@/components/InsightCard';
import { openaiService, type InsightCard as InsightCardType } from '@/lib/openai';
import { Plus, AlertTriangle, FileText, Clock, Package, RotateCcw, User, Send } from 'lucide-react';

interface IssueTemplate {
  category: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  defaultAssignee: string;
  requiredFields: string[];
  estimatedResolutionTime: string;
}

interface IssueForm {
  category: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  sku?: string;
  orderId?: string;
  supplier?: string;
  affectedCustomers?: number;
  financialImpact?: number;
  linkedInsight?: string;
  assignee?: string;
  attachments: File[];
}

export default function Submit() {
  const [insights, setInsights] = useState<InsightCardType[]>([]);
  const [issueForm, setIssueForm] = useState<IssueForm>({
    category: '',
    title: '',
    description: '',
    priority: 'medium',
    attachments: []
  });
  const [templates, setTemplates] = useState<IssueTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [availableInsights, setAvailableInsights] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [autoFillEnabled, setAutoFillEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissionData();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      applyTemplate(selectedTemplate);
    }
  }, [selectedTemplate]);

  const loadSubmissionData = async () => {
    try {
      setLoading(true);
      
      // Load issue templates
      const issueTemplates: IssueTemplate[] = [
        {
          category: 'stockout_risk',
          title: 'SKU Stockout Risk Alert',
          description: 'Critical stock level detected requiring immediate replenishment action',
          priority: 'critical',
          defaultAssignee: 'Supply Chain Team',
          requiredFields: ['sku', 'financialImpact'],
          estimatedResolutionTime: '24 hours'
        },
        {
          category: 'return_spike',
          title: 'Product Return Rate Investigation',
          description: 'Unusual return pattern detected requiring quality investigation',
          priority: 'high',
          defaultAssignee: 'Quality Assurance Team',
          requiredFields: ['sku', 'affectedCustomers'],
          estimatedResolutionTime: '3-5 days'
        },
        {
          category: 'sla_breach',
          title: 'SLA Performance Breach',
          description: 'Service level agreement violation requiring escalation',
          priority: 'high',
          defaultAssignee: 'Operations Manager',
          requiredFields: ['orderId', 'financialImpact'],
          estimatedResolutionTime: '2-3 days'
        },
        {
          category: 'supplier_issue',
          title: 'Supplier Performance Issue',
          description: 'Supplier reliability or quality issue requiring vendor management',
          priority: 'medium',
          defaultAssignee: 'Vendor Management',
          requiredFields: ['supplier', 'financialImpact'],
          estimatedResolutionTime: '5-7 days'
        },
        {
          category: 'inventory_discrepancy',
          title: 'Inventory Count Discrepancy',
          description: 'Physical vs system inventory mismatch requiring audit',
          priority: 'medium',
          defaultAssignee: 'Warehouse Team',
          requiredFields: ['sku'],
          estimatedResolutionTime: '1-2 days'
        },
        {
          category: 'custom',
          title: 'Custom Issue',
          description: 'General issue submission for manual categorization',
          priority: 'medium',
          defaultAssignee: 'Support Team',
          requiredFields: ['title', 'description'],
          estimatedResolutionTime: '3-5 days'
        }
      ];

      setTemplates(issueTemplates);

      // Simulate available insights that can be linked
      const mockInsights = [
        { id: 'INS-001', title: 'SKU-332 Critical Stock Alert', category: 'stockout_risk' },
        { id: 'INS-002', title: 'SKU-882 Return Rate Spike', category: 'return_spike' },
        { id: 'INS-003', title: 'Shipping SLA Breach Pattern', category: 'sla_breach' },
        { id: 'INS-004', title: 'Supplier ABC Delay Issues', category: 'supplier_issue' }
      ];

      setAvailableInsights(mockInsights);

      // Generate companion insights using IssueCompanionAgent simulation
      const companionInsights = await generateCompanionInsights();
      setInsights(companionInsights);

    } catch (error) {
      console.error('Failed to load submission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCompanionInsights = async (): Promise<InsightCardType[]> => {
    // Simulate IssueCompanionAgent providing helpful suggestions
    return [
      {
        id: 'companion-1',
        title: 'High Priority Issues Detected',
        description: '3 critical insights available for quick issue creation',
        financialImpact: 0,
        severity: 'medium',
        tags: ['Quick Actions', 'Automated', 'Priority'],
        suggestedActions: ['Use Auto-Fill', 'Create from Insight', 'Bulk Submit'],
        rootCause: 'Multiple operational issues requiring structured ticket creation',
        evidenceTrail: [],
        confidence: 0.85,
        agentName: 'IssueCompanionAgent'
      },
      {
        id: 'companion-2',
        title: 'Template Recommendations',
        description: 'Based on recent patterns, consider using stockout and return templates',
        financialImpact: 0,
        severity: 'low',
        tags: ['Templates', 'Efficiency', 'Patterns'],
        suggestedActions: ['Use Template', 'Save as Draft', 'Set Reminders'],
        rootCause: 'Historical issue patterns suggest optimal template selection',
        evidenceTrail: [],
        confidence: 0.78,
        agentName: 'IssueCompanionAgent'
      }
    ];
  };

  const applyTemplate = (templateCategory: string) => {
    const template = templates.find(t => t.category === templateCategory);
    if (template) {
      setIssueForm(prev => ({
        ...prev,
        category: template.category,
        title: template.title,
        description: template.description,
        priority: template.priority,
        assignee: template.defaultAssignee
      }));
    }
  };

  const autoFillFromInsight = (insightId: string) => {
    const insight = availableInsights.find(i => i.id === insightId);
    if (insight) {
      setIssueForm(prev => ({
        ...prev,
        title: insight.title,
        linkedInsight: insightId,
        category: insight.category
      }));
      
      // Auto-select matching template
      setSelectedTemplate(insight.category);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Submitting issue:', issueForm);
      setSubmitSuccess(true);
      
      // Reset form
      setIssueForm({
        category: '',
        title: '',
        description: '',
        priority: 'medium',
        attachments: []
      });
      setSelectedTemplate('');
      
    } catch (error) {
      console.error('Failed to submit issue:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof IssueForm, value: any) => {
    setIssueForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const categories = [
    { value: 'stockout_risk', label: 'Stockout Risk' },
    { value: 'return_spike', label: 'Return Spike' },
    { value: 'sla_breach', label: 'SLA Breach' },
    { value: 'supplier_issue', label: 'Supplier Issue' },
    { value: 'inventory_discrepancy', label: 'Inventory Discrepancy' },
    { value: 'custom', label: 'Custom Issue' }
  ];

  const priorities = [
    { value: 'critical', label: 'Critical', color: 'bg-destructive text-destructive-foreground' },
    { value: 'high', label: 'High', color: 'bg-warning text-warning-foreground' },
    { value: 'medium', label: 'Medium', color: 'bg-info text-info-foreground' },
    { value: 'low', label: 'Low', color: 'bg-muted text-muted-foreground' }
  ];

  const getPriorityColor = (priority: string) => {
    return priorities.find(p => p.value === priority)?.color || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Submit an Issue</h1>
          <p className="text-muted-foreground">Structured submission with insight autofill</p>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="auto-fill" 
            checked={autoFillEnabled}
            onCheckedChange={setAutoFillEnabled}
          />
          <Label htmlFor="auto-fill" className="text-sm">Enable Auto-Fill</Label>
        </div>
      </div>

      {submitSuccess && (
        <Card className="border-l-4 border-l-success">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-success" />
              <span className="font-medium">Issue submitted successfully!</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Your issue has been created and assigned to the appropriate team.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issue Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Issue Details</CardTitle>
              <CardDescription>Provide information about the issue you want to report</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Template Selection */}
                <div className="space-y-2">
                  <Label>Issue Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.category} value={template.category}>
                          {template.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={issueForm.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select issue category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={issueForm.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    value={issueForm.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Detailed description of the issue"
                    rows={4}
                    required
                  />
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={issueForm.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          <div className="flex items-center space-x-2">
                            <Badge className={priority.color}>{priority.label}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU (if applicable)</Label>
                    <Input
                      value={issueForm.sku || ''}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      placeholder="e.g., SKU-1234"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Order ID (if applicable)</Label>
                    <Input
                      value={issueForm.orderId || ''}
                      onChange={(e) => handleInputChange('orderId', e.target.value)}
                      placeholder="e.g., ORD-123456"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Financial Impact ($)</Label>
                    <Input
                      type="number"
                      value={issueForm.financialImpact || ''}
                      onChange={(e) => handleInputChange('financialImpact', parseFloat(e.target.value))}
                      placeholder="Estimated dollar impact"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Affected Customers</Label>
                    <Input
                      type="number"
                      value={issueForm.affectedCustomers || ''}
                      onChange={(e) => handleInputChange('affectedCustomers', parseInt(e.target.value))}
                      placeholder="Number of customers affected"
                    />
                  </div>
                </div>

                {/* Linked Insight */}
                {availableInsights.length > 0 && (
                  <div className="space-y-2">
                    <Label>Link to Insight (optional)</Label>
                    <Select value={issueForm.linkedInsight || ''} onValueChange={(value) => handleInputChange('linkedInsight', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select related insight" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableInsights.map((insight) => (
                          <SelectItem key={insight.id} value={insight.id}>
                            {insight.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex items-center space-x-4 pt-4">
                  <Button type="submit" disabled={isSubmitting || !issueForm.title || !issueForm.description}>
                    {isSubmitting ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Issue
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIssueForm({
                    category: '',
                    title: '',
                    description: '',
                    priority: 'medium',
                    attachments: []
                  })}>
                    Clear Form
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableInsights.slice(0, 3).map((insight) => (
                <Button
                  key={insight.id}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left"
                  onClick={() => autoFillFromInsight(insight.id)}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  <div className="truncate">
                    <div className="font-medium text-xs">{insight.title}</div>
                    <div className="text-xs text-muted-foreground">{insight.category.replace('_', ' ')}</div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Issue Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Common Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates.slice(0, 4).map((template) => (
                <div key={template.category} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{template.title}</div>
                      <div className="text-xs text-muted-foreground">{template.estimatedResolutionTime}</div>
                    </div>
                    <Badge className={getPriorityColor(template.priority)}>
                      {template.priority}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setSelectedTemplate(template.category)}
                  >
                    Use Template
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* IssueCompanion Agent Insights */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold">IssueCompanion Agent</h3>
              <Badge className="bg-primary text-primary-foreground">Active</Badge>
            </div>
            
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
      </div>
    </div>
  );
}
