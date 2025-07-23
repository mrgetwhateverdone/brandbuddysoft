import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InsightCard } from '@/components/InsightCard';
import { useTinybirdConnection } from '@/hooks/use-tinybird-connection';
import { openaiService, type InsightCard as InsightCardType } from '@/lib/openai';
import { FileText, Clock, CheckCircle, AlertTriangle, User, Calendar, ArrowRight, Plus, DollarSign, RefreshCw } from 'lucide-react';

interface WorkflowMetrics {
  totalWorkflows: number;
  openWorkflows: number;
  overdueWorkflows: number;
  completedThisWeek: number;
  avgCompletionTime: number;
  completionRate: number;
}

interface Workflow {
  id: string;
  title: string;
  type: 'replenishment' | 'return_investigation' | 'sla_escalation' | 'supplier_issue' | 'inventory_audit';
  status: 'proposed' | 'accepted' | 'in_progress' | 'completed' | 'rejected';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignedTo: string;
  createdDate: string;
  dueDate: string;
  completedDate?: string;
  progress: number;
  linkedInsight?: string;
  description: string;
  tasks: WorkflowTask[];
  financialImpact: number;
  auditTrail: AuditEntry[];
}

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

interface WorkflowTask {
  id: string;
  title: string;
  completed: boolean;
  assignee: string;
  dueDate: string;
}

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [insights, setInsights] = useState<InsightCardType[]>([]);
  const [metrics, setMetrics] = useState<WorkflowMetrics>({
    totalWorkflows: 0,
    openWorkflows: 0,
    overdueWorkflows: 0,
    completedThisWeek: 0,
    avgCompletionTime: 0,
    completionRate: 0
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalFinancialImpact, setModalFinancialImpact] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditTrailModal, setAuditTrailModal] = useState<{open: boolean, workflow: Workflow | null}>({open: false, workflow: null});
  const { isConnected, error: connectionError } = useTinybirdConnection();

  useEffect(() => {
    loadWorkflowsData();
  }, [selectedStatus, selectedType]);

  const loadWorkflowsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // In real implementation, would fetch from backend
      const workflowsData: Workflow[] = [
        {
          id: 'WF-001',
          title: 'Emergency Replenishment for SKU-332',
          type: 'replenishment',
          status: 'in_progress',
          priority: 'critical',
          assignedTo: 'Supply Team',
          createdDate: '2024-01-15',
          dueDate: '2024-01-18',
          progress: 65,
          linkedInsight: 'INS-332-001',
          description: 'Create emergency PO for SKU-332 due to critical stock level',
          financialImpact: 12500,
          auditTrail: [
            { id: 'A1', action: 'Workflow Created', user: 'System', timestamp: '2024-01-15T10:00:00Z' },
            { id: 'A2', action: 'Accepted by Supply Team', user: 'Sarah M.', timestamp: '2024-01-15T11:30:00Z' },
            { id: 'A3', action: 'Task 1 Completed', user: 'Sarah M.', timestamp: '2024-01-16T14:00:00Z', details: 'Supplier confirmed availability' }
          ],
          tasks: [
            { id: 'T1', title: 'Contact supplier for availability', completed: true, assignee: 'Sarah M.', dueDate: '2024-01-16' },
            { id: 'T2', title: 'Create purchase order', completed: true, assignee: 'Mike R.', dueDate: '2024-01-17' },
            { id: 'T3', title: 'Arrange expedited shipping', completed: false, assignee: 'Tom K.', dueDate: '2024-01-18' },
            { id: 'T4', title: 'Update inventory forecast', completed: false, assignee: 'Lisa P.', dueDate: '2024-01-19' }
          ]
        },
        {
          id: 'WF-002',
          title: 'SKU-882 Return Rate Investigation',
          type: 'return_investigation',
          status: 'accepted',
          priority: 'high',
          assignedTo: 'Quality Team',
          createdDate: '2024-01-14',
          dueDate: '2024-01-21',
          progress: 30,
          linkedInsight: 'INS-882-002',
          description: 'Investigate root cause of 90% increase in return rate for SKU-882',
          auditTrail: [
            { id: 'A4', action: 'Workflow Created', user: 'System', timestamp: '2024-01-14T09:00:00Z' },
            { id: 'A5', action: 'Accepted by Quality Team', user: 'John D.', timestamp: '2024-01-14T10:30:00Z' },
            { id: 'A6', action: 'Return analysis started', user: 'John D.', timestamp: '2024-01-15T14:00:00Z', details: 'Initial data collection completed' }
          ],
          tasks: [
            { id: 'T5', title: 'Analyze return reasons', completed: true, assignee: 'QA Team', dueDate: '2024-01-16' },
            { id: 'T6', title: 'Contact customers for feedback', completed: false, assignee: 'CS Team', dueDate: '2024-01-18' },
            { id: 'T7', title: 'Review manufacturing batch', completed: false, assignee: 'QA Team', dueDate: '2024-01-20' },
            { id: 'T8', title: 'Implement corrective actions', completed: false, assignee: 'Operations', dueDate: '2024-01-21' }
          ]
        },
        {
          id: 'WF-003',
          title: 'SLA Performance Escalation',
          type: 'sla_escalation',
          status: 'proposed',
          priority: 'medium',
          assignedTo: 'Operations Manager',
          createdDate: '2024-01-16',
          dueDate: '2024-01-23',
          progress: 0,
          linkedInsight: 'INS-SLA-003',
          description: 'Address repeated SLA breaches in shipping performance',
          tasks: [
            { id: 'T9', title: 'Review carrier performance', completed: false, assignee: 'Logistics', dueDate: '2024-01-18' },
            { id: 'T10', title: 'Escalate to carrier management', completed: false, assignee: 'Account Mgr', dueDate: '2024-01-20' },
            { id: 'T11', title: 'Implement process improvements', completed: false, assignee: 'Process Team', dueDate: '2024-01-23' }
          ]
        },
        {
          id: 'WF-004',
          title: 'Overstock Markdown Strategy',
          type: 'inventory_audit',
          status: 'completed',
          priority: 'medium',
          assignedTo: 'Inventory Team',
          createdDate: '2024-01-10',
          dueDate: '2024-01-15',
          completedDate: '2024-01-14',
          progress: 100,
          linkedInsight: 'INS-INV-004',
          description: 'Develop markdown strategy for SKU-1342 overstock situation',
          tasks: [
            { id: 'T12', title: 'Analyze inventory levels', completed: true, assignee: 'Analyst', dueDate: '2024-01-12' },
            { id: 'T13', title: 'Calculate markdown scenarios', completed: true, assignee: 'Finance', dueDate: '2024-01-13' },
            { id: 'T14', title: 'Implement pricing strategy', completed: true, assignee: 'Pricing Team', dueDate: '2024-01-14' }
          ]
        }
      ];

      // Filter workflows based on selection
      let filteredWorkflows = workflowsData;
      if (selectedStatus !== 'all') {
        filteredWorkflows = filteredWorkflows.filter(w => w.status === selectedStatus);
      }
      if (selectedType !== 'all') {
        filteredWorkflows = filteredWorkflows.filter(w => w.type === selectedType);
      }

      setWorkflows(filteredWorkflows);

      // Calculate metrics
      const totalWorkflows = workflowsData.length;
      const openWorkflows = workflowsData.filter(w => w.status !== 'completed' && w.status !== 'rejected').length;
      const overdueWorkflows = workflowsData.filter(w => {
        const due = new Date(w.dueDate);
        const now = new Date();
        return due < now && w.status !== 'completed';
      }).length;

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const completedThisWeek = workflowsData.filter(w =>
        w.completedDate && new Date(w.completedDate) > weekAgo
      ).length;

      const avgCompletionTime = 4.2; // Mock average in days
      const completionRate = (workflowsData.filter(w => w.status === 'completed').length / totalWorkflows) * 100;

      setMetrics({
        totalWorkflows,
        openWorkflows,
        overdueWorkflows,
        completedThisWeek,
        avgCompletionTime,
        completionRate
      });

      // Generate insights using FollowUpAgent simulation
      const generatedInsights = await generateFollowUpInsights(workflowsData);
      setInsights(generatedInsights);

    } catch (error) {
      console.error('Failed to load workflows data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateFollowUpInsights = async (workflows: Workflow[]): Promise<InsightCardType[]> => {
    // Simulate FollowUpAgent analysis
    const overdue = workflows.filter(w => {
      const due = new Date(w.dueDate);
      const now = new Date();
      return due < now && w.status !== 'completed';
    });

    const idleWorkflows = workflows.filter(w => 
      w.status === 'proposed' && 
      new Date(Date.now() - new Date(w.createdDate).getTime()) > new Date(2 * 24 * 60 * 60 * 1000)
    );

    const insights: InsightCardType[] = [];

    if (overdue.length > 0) {
      insights.push({
        id: 'followup-1',
        title: `${overdue.length} Workflows Past Due`,
        description: 'Multiple workflows have exceeded their SLA window and need immediate attention',
        financialImpact: overdue.length * 2500,
        severity: 'high',
        tags: ['Overdue', 'SLA Breach', 'Workflow Management'],
        suggestedActions: ['Escalate to Manager', 'Reassign Tasks', 'Extend Deadline'],
        rootCause: 'Resource constraints and competing priorities causing workflow delays',
        evidenceTrail: [],
        confidence: 0.94,
        agentName: 'FollowUpAgent'
      });
    }

    if (idleWorkflows.length > 0) {
      insights.push({
        id: 'followup-2',
        title: `${idleWorkflows.length} Workflows Awaiting Approval`,
        description: 'Proposed workflows have been idle for more than 48 hours',
        financialImpact: idleWorkflows.length * 1200,
        severity: 'medium',
        tags: ['Approval Needed', 'Idle Workflows', 'Process Delay'],
        suggestedActions: ['Nudge Approver', 'Auto-Approve Low Risk', 'Escalate to Manager'],
        rootCause: 'Approval bottleneck in workflow initiation process',
        evidenceTrail: [],
        confidence: 0.88,
        agentName: 'FollowUpAgent'
      });
    }

    return insights;
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'proposed', label: 'Proposed' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'replenishment', label: 'Replenishment' },
    { value: 'return_investigation', label: 'Return Investigation' },
    { value: 'sla_escalation', label: 'SLA Escalation' },
    { value: 'supplier_issue', label: 'Supplier Issue' },
    { value: 'inventory_audit', label: 'Inventory Audit' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'in_progress': return 'bg-info text-info-foreground';
      case 'accepted': return 'bg-warning text-warning-foreground';
      case 'proposed': return 'bg-muted text-muted-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-info text-info-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleWorkflowAction = (workflowId: string, action: string) => {
    setWorkflows(prev => prev.map(workflow => {
      if (workflow.id !== workflowId) return workflow;

      const newAuditEntry: AuditEntry = {
        id: `A${Date.now()}`,
        action: `${action} action`,
        user: 'Current User',
        timestamp: new Date().toISOString(),
        details: `Workflow ${action.toLowerCase()}ed`
      };

      switch (action) {
        case 'acknowledge':
          return {
            ...workflow,
            status: 'accepted' as const,
            auditTrail: [...workflow.auditTrail, newAuditEntry]
          };
        case 'resolve':
          return {
            ...workflow,
            status: 'completed' as const,
            progress: 100,
            completedDate: new Date().toISOString(),
            auditTrail: [...workflow.auditTrail, newAuditEntry]
          };
        case 'reassign':
          return {
            ...workflow,
            assignedTo: 'Reassigned Team',
            auditTrail: [...workflow.auditTrail, { ...newAuditEntry, details: 'Workflow reassigned to different team' }]
          };
        default:
          return workflow;
      }
    }));
  };

  const createWorkflowFromModal = () => {
    if (!modalTitle.trim()) return;

    const newWorkflow: Workflow = {
      id: `WF-${Date.now()}`,
      title: modalTitle,
      type: 'supplier_issue',
      status: 'proposed',
      priority: 'medium',
      assignedTo: 'Unassigned',
      createdDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 0,
      description: modalDescription,
      financialImpact: parseFloat(modalFinancialImpact) || 0,
      auditTrail: [{
        id: 'A1',
        action: 'Workflow Created',
        user: 'Current User',
        timestamp: new Date().toISOString(),
        details: 'Manually created workflow'
      }],
      tasks: []
    };

    setWorkflows(prev => [newWorkflow, ...prev]);
    setIsModalOpen(false);
    setModalTitle('');
    setModalDescription('');
    setModalFinancialImpact('');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Workflows & Follow-ups</h1>
          <p className="text-muted-foreground">Track issue resolution and workflow completion</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadWorkflowsData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Workflow Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalWorkflows.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Workflows</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-info" />
              <div>
                <p className="text-2xl font-bold">{metrics.openWorkflows.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Open Workflows</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold">{metrics.overdueWorkflows.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <div>
                <p className="text-2xl font-bold">{metrics.completionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FollowUp Agent Insights */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">FollowUp Agent Analysis</h2>
          <Badge className="bg-info text-info-foreground">
            Workflow Monitoring
          </Badge>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
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
        )}
      </div>

      {/* Active Workflows */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Active Workflows</h2>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Workflow
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workflow</DialogTitle>
                <DialogDescription>
                  Create a new operational workflow from scratch
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    placeholder="Enter workflow title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={modalDescription}
                    onChange={(e) => setModalDescription(e.target.value)}
                    placeholder="Describe the workflow objective"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="impact">Financial Impact ($)</Label>
                  <Input
                    id="impact"
                    type="number"
                    value={modalFinancialImpact}
                    onChange={(e) => setModalFinancialImpact(e.target.value)}
                    placeholder="Estimated financial impact"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Button onClick={createWorkflowFromModal}>Create Workflow</Button>
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{workflow.title}</CardTitle>
                  <CardDescription>{workflow.description}</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getPriorityColor(workflow.priority)}>
                    {workflow.priority}
                  </Badge>
                  <Badge className={getStatusColor(workflow.status)}>
                    {workflow.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{workflow.assignedTo}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Due: {new Date(workflow.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{workflow.type.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>${workflow.financialImpact.toLocaleString()}</span>
                </div>
              </div>

              {workflow.status !== 'completed' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{workflow.progress}%</span>
                  </div>
                  <Progress value={workflow.progress} className="h-2" />
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Tasks:</h4>
                <div className="space-y-1">
                  {workflow.tasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-center space-x-2 text-xs">
                      <CheckCircle className={`h-3 w-3 ${task.completed ? 'text-success' : 'text-muted-foreground'}`} />
                      <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                        {task.title}
                      </span>
                      <span className="text-muted-foreground">({task.assignee})</span>
                    </div>
                  ))}
                  {workflow.tasks.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{workflow.tasks.length - 3} more tasks...
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {workflow.status === 'proposed' && (
                  <>
                    <Button size="sm" onClick={() => handleWorkflowAction(workflow.id, 'acknowledge')}>
                      Acknowledge
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleWorkflowAction(workflow.id, 'reassign')}>
                      Reassign
                    </Button>
                  </>
                )}
                {workflow.status === 'in_progress' && (
                  <>
                    <Button size="sm" onClick={() => handleWorkflowAction(workflow.id, 'resolve')}>
                      Resolve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleWorkflowAction(workflow.id, 'reassign')}>
                      Reassign
                    </Button>
                  </>
                )}
                {workflow.status === 'accepted' && (
                  <>
                    <Button size="sm" onClick={() => handleWorkflowAction(workflow.id, 'resolve')}>
                      Resolve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleWorkflowAction(workflow.id, 'reassign')}>
                      Reassign
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => setAuditTrailModal({open: true, workflow})}>
                  View Audit Trail
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workflows.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              No workflows found matching your criteria.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail Modal */}
      <Dialog open={auditTrailModal.open} onOpenChange={(open) => setAuditTrailModal({...auditTrailModal, open})}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Trail - {auditTrailModal.workflow?.title}</DialogTitle>
            <DialogDescription>
              Complete history of changes and actions for this workflow
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {auditTrailModal.workflow?.auditTrail.map((entry) => (
              <div key={entry.id} className="border-l-2 border-primary pl-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium">{entry.action}</h4>
                    {entry.details && (
                      <p className="text-sm text-muted-foreground">{entry.details}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{entry.user}</div>
                    <div>{new Date(entry.timestamp).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
            {(!auditTrailModal.workflow?.auditTrail || auditTrailModal.workflow.auditTrail.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No audit trail entries found.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
