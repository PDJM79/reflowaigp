import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, User, CheckCircle, AlertTriangle, Play, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RAGBadge } from '@/components/dashboard/RAGBadge';
import { BackButton } from '@/components/ui/back-button';
import { toast } from 'sonner';

interface ProcessInstance {
  id: string;
  template_id: string;
  practice_id: string;
  assignee_id: string;
  status: string;
  period_start: string;
  period_end: string;
  due_at: string;
  started_at: string;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

interface ProcessTemplate {
  id: string;
  name: string;
  steps: any;
  responsible_role: string;
  frequency: string;
  evidence_hint: string;
}

interface StepInstance {
  id: string;
  process_instance_id: string;
  step_index: number;
  title: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface SimpleTask {
  id: string;
  title: string;
  description: string;
  module: string;
  status: string;
  due_at: string;
  priority: string;
  assigned_to_user_id: string;
  completed_at: string;
  created_at: string;
}

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [processInstance, setProcessInstance] = useState<ProcessInstance | null>(null);
  const [processTemplate, setProcessTemplate] = useState<ProcessTemplate | null>(null);
  const [stepInstances, setStepInstances] = useState<StepInstance[]>([]);
  const [simpleTask, setSimpleTask] = useState<SimpleTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskType, setTaskType] = useState<'process' | 'simple' | null>(null);

  useEffect(() => {
    if (!taskId || !user) return;

    const fetchTaskData = async () => {
      try {
        // First try to fetch from process_instances
        const piRes = await fetch(`/api/practices/${user!.practiceId}/process-instances/${taskId}`, { credentials: 'include' });
        const instance = piRes.ok ? await piRes.json() : null;

        if (instance) {
          const templateId = instance.templateId ?? instance.template_id;
          setProcessInstance({ ...instance, template_id: templateId });
          setTaskType('process');

          // Fetch template
          const tplRes = await fetch(`/api/practices/${user!.practiceId}/process-templates/${templateId}`, { credentials: 'include' });
          setProcessTemplate(tplRes.ok ? await tplRes.json() : null);

          // Fetch step instances
          const stepsRes = await fetch(`/api/practices/${user!.practiceId}/process-instances/${taskId}/step-instances`, { credentials: 'include' });
          setStepInstances(stepsRes.ok ? await stepsRes.json() : []);
        } else {
          // If not found in process_instances, try the tasks API
          const res = await fetch(`/api/practices/${user!.practiceId}/tasks/${taskId}`, {
            credentials: 'include',
          });
          if (res.ok) {
            const task = await res.json();
            setSimpleTask({
              id: task.id,
              title: task.title,
              description: task.description || '',
              module: task.module || '',
              status: task.status || 'pending',
              due_at: task.dueAt,
              priority: task.priority || 'medium',
              assigned_to_user_id: task.assigneeId,
              completed_at: task.completedAt,
              created_at: task.createdAt,
            });
            setTaskType('simple');
          }
        }
      } catch (error) {
        console.error('Error fetching task data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskData();
  }, [taskId, user]);

  const handleStartProcess = async () => {
    if (!processInstance || !processTemplate) return;

    try {
      // Update process instance to started
      await fetch(`/api/practices/${user!.practiceId}/process-instances/${processInstance.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress', startedAt: new Date().toISOString() }),
      });

      // Always create step instances when starting a process
      if (processTemplate.steps) {
        // Parse steps with same logic as display
        let stepsArray = [];
        if (Array.isArray(processTemplate.steps)) {
          stepsArray = processTemplate.steps;
        } else if (typeof processTemplate.steps === 'string') {
          try {
            stepsArray = JSON.parse(processTemplate.steps);
          } catch (e) {
            console.error('Error parsing steps JSON:', e);
            stepsArray = [];
          }
        } else if (typeof processTemplate.steps === 'object') {
          stepsArray = processTemplate.steps;
        }
        
        if (Array.isArray(stepsArray) && stepsArray.length > 0) {
        
        // First, check if step instances already exist
        const existRes = await fetch(`/api/practices/${user!.practiceId}/process-instances/${processInstance.id}/step-instances`, { credentials: 'include' });
        const existingSteps = existRes.ok ? await existRes.json() as any[] : [];
        const existingIndices = existingSteps.map(s => s.step_index);

        // Create missing step instances
        const stepsToCreate = stepsArray
          .map((step: any, index: number) => ({
            stepIndex: index,
            title: step.title || step.description || `Step ${index + 1}`,
            status: 'pending' as const,
          }))
          .filter((_, index) => !existingIndices.includes(index));

        if (stepsToCreate.length > 0) {
          await fetch(`/api/practices/${user!.practiceId}/process-instances/${processInstance.id}/step-instances`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steps: stepsToCreate }),
          });
        }
      }
      }

      // Navigate to first step
      navigate(`/task/${taskId}/step/0`);
    } catch (error) {
      console.error('Error starting process:', error);
    }
  };

  const handleCompleteSimpleTask = async () => {
    if (!simpleTask || !user?.practiceId) return;

    try {
      const res = await fetch(`/api/practices/${user.practiceId}/tasks/${simpleTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'complete' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(typeof err?.error === 'string' ? err.error : 'Failed to complete task');
      }

      setSimpleTask({ ...simpleTask, status: 'complete', completed_at: new Date().toISOString() });
      toast.success('Task completed');
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete task');
    }
  };

  const handleContinueToStep = (stepIndex: number) => {
    navigate(`/task/${taskId}/step/${stepIndex}`);
  };

  const getStepStatus = (stepIndex: number) => {
    const step = stepInstances.find(s => s.step_index === stepIndex);
    return step?.status || 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isOverdue = (dueAt: string) => {
    return new Date(dueAt) < new Date();
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  // Render simple task view
  if (taskType === 'simple' && simpleTask) {
    const overdue = simpleTask.status !== 'complete' && isOverdue(simpleTask.due_at);
    
    return (
      <div className="p-4 md:p-6">
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-6">
            <BackButton fallbackPath="/" />
            <div>
              <h1 className="text-2xl font-bold">{simpleTask.title}</h1>
              <p className={`text-sm ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                {overdue ? 'Overdue - ' : ''}Due: {new Date(simpleTask.due_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Task Details
                    <Badge variant={simpleTask.status === 'complete' ? 'default' : overdue ? 'destructive' : 'outline'}>
                      {simpleTask.status === 'complete' ? 'Complete' : overdue ? 'Overdue' : simpleTask.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {simpleTask.description && (
                    <div>
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-muted-foreground">{simpleTask.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Module</p>
                      <Badge variant="outline" className="mt-1">{simpleTask.module || 'General'}</Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Priority</p>
                      <Badge variant={simpleTask.priority === 'high' ? 'destructive' : 'outline'} className="mt-1">
                        {simpleTask.priority || 'Normal'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <RAGBadge status={simpleTask.status === 'complete' ? 'green' : overdue ? 'red' : 'amber'} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Due Date</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(simpleTask.due_at).toLocaleString()}
                    </p>
                  </div>
                  {simpleTask.completed_at && (
                    <div>
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(simpleTask.completed_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  {simpleTask.status !== 'complete' ? (
                    <Button onClick={handleCompleteSimpleTask} className="w-full">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  ) : (
                    <Badge variant="outline" className="w-full justify-center py-2">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Task Complete
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render process instance view (existing logic)
  if (!processInstance || !processTemplate) {
    return (
      <div className="p-4 md:p-6">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Task Not Found</h1>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const completedSteps = stepInstances.filter(s => s.status === 'complete').length;
  
  // Parse steps from template - handle both array and JSON string formats
  let stepsArray = [];
  if (processTemplate.steps) {
    if (Array.isArray(processTemplate.steps)) {
      stepsArray = processTemplate.steps;
    } else if (typeof processTemplate.steps === 'string') {
      try {
        stepsArray = JSON.parse(processTemplate.steps);
      } catch (e) {
        console.error('Error parsing steps JSON:', e);
        stepsArray = [];
      }
    } else if (typeof processTemplate.steps === 'object') {
      // Handle object format from database
      stepsArray = processTemplate.steps;
    }
  }
  
  const totalSteps = Array.isArray(stepsArray) ? stepsArray.length : 0;

  return (
    <div className="p-4 md:p-6">
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/" />
          <div>
            <h1 className="text-2xl font-bold">{processTemplate.name}</h1>
            <p className="text-muted-foreground">
              Due: {new Date(processInstance.due_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Process Steps
                  <Badge variant="outline">
                    {completedSteps}/{totalSteps} Complete
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {processTemplate.evidence_hint}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stepsArray.length > 0 ? (
                  stepsArray.map((step: any, index: number) => {
                    const stepStatus = getStepStatus(index);
                    return (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(stepStatus)}
                          <div>
                            <h3 className="font-medium">
                              Step {index + 1}: {step.title || step.description || 'Process Step'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {step.description || 'Complete this step to proceed'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <RAGBadge status={stepStatus === 'complete' ? 'green' : stepStatus === 'pending' ? 'red' : 'amber'} />
                          {stepStatus !== 'complete' && (
                            <Button 
                              size="sm"
                              onClick={() => handleContinueToStep(index)}
                            >
                              {stepStatus === 'pending' ? 'Start' : 'Continue'}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                    <p>No steps defined for this process</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Process Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant="outline" className="mt-1">
                    {processInstance.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Responsible Role</p>
                  <p className="text-sm text-muted-foreground">{processTemplate.responsible_role}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Frequency</p>
                  <p className="text-sm text-muted-foreground">{processTemplate.frequency}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Period</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(processInstance.period_start).toLocaleDateString()} - {new Date(processInstance.period_end).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                {processInstance.status === 'pending' ? (
                  <Button onClick={handleStartProcess} className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Start Process
                  </Button>
                ) : (
                  <div className="space-y-2">
                     <Button 
                       onClick={() => {
                         const nextStep = stepInstances.find(s => s.status !== 'complete');
                         if (nextStep) {
                           handleContinueToStep(nextStep.step_index);
                         }
                       }}
                       className="w-full"
                       disabled={completedSteps === totalSteps}
                     >
                      Continue Process
                    </Button>
                    {completedSteps === totalSteps && (
                      <Badge variant="outline" className="w-full justify-center py-2">
                        Process Complete
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
