import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { InsightCard } from '@/components/InsightCard';
import { openaiService, type InsightCard as InsightCardType } from '@/lib/openai';
import { FileText, Clock, CheckCircle, AlertTriangle, User, Calendar, ArrowRight } from 'lucide-react';

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
}

interface WorkflowTask {
  id: string;
  title: string;
  completed: boolean;
  assignee: string;
  dueDate: string;
}

export default function Workflows() {
  const [insights, setInsights] = useState<InsightCardType[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflowsData();
  }, [selectedStatus, selectedType]);

  const loadWorkflowsData = async () => {
    try {
      setLoading(true);
      
      // Generate mock workflow data (in real implementation, would fetch from backend)
      const mockWorkflows: Workflow[] = [
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
      let filteredWorkflows = mockWorkflows;
      if (selectedStatus !== 'all') {
        filteredWorkflows = filteredWorkflows.filter(w => w.status === selectedStatus);
      }
      if (selectedType !== 'all') {
        filteredWorkflows = filteredWorkflows.filter(w => w.type === selectedType);
      }

      setWorkflows(filteredWorkflows);

      // Calculate metrics
      const totalWorkflows = mockWorkflows.length;
      const openWorkflows = mockWorkflows.filter(w => w.status !== 'completed' && w.status !== 'rejected').length;
      const overdueWorkflows = mockWorkflows.filter(w => {
        const due = new Date(w.dueDate);
        const now = new Date();
        return due < now && w.status !== 'completed';
      }).length;
      
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const completedThisWeek = mockWorkflows.filter(w => 
        w.completedDate && new Date(w.completedDate) > weekAgo
      ).length;
      
      const avgCompletionTime = 4.2; // Mock average in days
      const completionRate = (mockWorkflows.filter(w => w.status === 'completed').length / totalWorkflows) * 100;

      setMetrics({
        totalWorkflows,
        openWorkflows,
        overdueWorkflows,
        completedThisWeek,
        avgCompletionTime,
        completionRate
      });

      // Generate insights using FollowUpAgent simulation
      const generatedInsights = await generateFollowUpInsights(mockWorkflows);
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
    console.log(`Action ${action} triggered for workflow ${workflowId}`);
    // In real implementation, would call API to update workflow
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
        <h2 className="text-xl font-semibold">Active Workflows</h2>
        
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
              <div className="grid grid-cols-3 gap-4 text-sm">
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
                    <Button size="sm" onClick={() => handleWorkflowAction(workflow.id, 'approve')}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleWorkflowAction(workflow.id, 'reject')}>
                      Reject
                    </Button>
                  </>
                )}
                {workflow.status === 'in_progress' && (
                  <>
                    <Button size="sm" onClick={() => handleWorkflowAction(workflow.id, 'complete')}>
                      Mark Complete
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleWorkflowAction(workflow.id, 'escalate')}>
                      Escalate
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => handleWorkflowAction(workflow.id, 'view')}>
                  View Details
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
    </div>
  );
}
