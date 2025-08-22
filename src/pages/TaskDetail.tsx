import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/layout/AppHeader';
import { ArrowLeft, Clock, User, CheckCircle, AlertTriangle, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RAGBadge } from '@/components/dashboard/RAGBadge';

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

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [processInstance, setProcessInstance] = useState<ProcessInstance | null>(null);
  const [processTemplate, setProcessTemplate] = useState<ProcessTemplate | null>(null);
  const [stepInstances, setStepInstances] = useState<StepInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId || !user) return;

    const fetchTaskData = async () => {
      try {
        // Fetch process instance
        const { data: instance } = await supabase
          .from('process_instances')
          .select('*')
          .eq('id', taskId)
          .single();

        if (instance) {
          setProcessInstance(instance);

          // Fetch template
          const { data: template } = await supabase
            .from('process_templates')
            .select('*')
            .eq('id', instance.template_id)
            .single();

          setProcessTemplate(template);

          // Fetch step instances
          const { data: steps } = await supabase
            .from('step_instances')
            .select('*')
            .eq('process_instance_id', taskId)
            .order('step_index', { ascending: true });

          setStepInstances(steps || []);
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
      await supabase
        .from('process_instances')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', processInstance.id);

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
        const { data: existingSteps } = await supabase
          .from('step_instances')
          .select('step_index')
          .eq('process_instance_id', processInstance.id);

        const existingIndices = existingSteps?.map(s => s.step_index) || [];
        
        // Create missing step instances
        const stepsToCreate = stepsArray
          .map((step: any, index: number) => ({
            process_instance_id: processInstance.id,
            step_index: index,
            title: step.title || step.description || `Step ${index + 1}`,
            status: 'pending' as const
          }))
          .filter((_, index) => !existingIndices.includes(index));

        if (stepsToCreate.length > 0) {
          await supabase
            .from('step_instances')
            .insert(stepsToCreate);
        }
      }
      }

      // Navigate to first step
      navigate(`/task/${taskId}/step/0`);
    } catch (error) {
      console.error('Error starting process:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (!processInstance || !processTemplate) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
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
  
  console.log('Raw steps data:', processTemplate.steps);
  console.log('Parsed steps array:', stepsArray);
  
  const totalSteps = Array.isArray(stepsArray) ? stepsArray.length : 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
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