import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/layout/AppHeader';
import { ArrowLeft, Clock, User, CheckCircle, AlertTriangle, Play, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RAGBadge } from '@/components/dashboard/RAGBadge';
import { BackButton } from '@/components/ui/back-button';

interface SimpleTask {
  id: string;
  title: string;
  description: string;
  module: string;
  status: string;
  dueAt: string;
  priority: string;
  assigneeId: string;
  completedAt: string;
  createdAt: string;
}

interface ProcessTemplate {
  id: string;
  name: string;
  steps: any;
  responsibleRole: string;
  frequency: string;
  evidenceHint: string;
}

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [simpleTask, setSimpleTask] = useState<SimpleTask | null>(null);
  const [loading, setLoading] = useState(true);

  const practiceId = user?.practiceId || '';

  useEffect(() => {
    if (!taskId || !user || !practiceId) return;

    const fetchTaskData = async () => {
      try {
        const res = await fetch(`/api/practices/${practiceId}/tasks/${taskId}`, { credentials: 'include' });
        if (res.ok) {
          const task = await res.json();
          setSimpleTask(task);
        }
      } catch (error) {
        console.error('Error fetching task data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskData();
  }, [taskId, user, practiceId]);

  const handleCompleteSimpleTask = async () => {
    if (!simpleTask || !practiceId) return;

    try {
      const res = await fetch(`/api/practices/${practiceId}/tasks/${simpleTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          status: 'complete',
          completedAt: new Date().toISOString()
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSimpleTask(updated);
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const isOverdue = (dueAt: string) => {
    return new Date(dueAt) < new Date();
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

  if (!simpleTask) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Task Not Found</h1>
            <Button onClick={() => navigate('/')} data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const overdue = simpleTask.status !== 'complete' && simpleTask.dueAt && isOverdue(simpleTask.dueAt);
    
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-task-title">{simpleTask.title}</h1>
            <p className={`text-sm ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
              {overdue ? 'Overdue - ' : ''}Due: {simpleTask.dueAt ? new Date(simpleTask.dueAt).toLocaleDateString() : 'No due date'}
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
                    <p className="text-muted-foreground" data-testid="text-task-description">{simpleTask.description}</p>
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
                    {simpleTask.dueAt ? new Date(simpleTask.dueAt).toLocaleString() : 'No due date'}
                  </p>
                </div>
                {simpleTask.completedAt && (
                  <div>
                    <p className="text-sm font-medium">Completed</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(simpleTask.completedAt).toLocaleString()}
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
                  <Button onClick={handleCompleteSimpleTask} className="w-full" data-testid="button-mark-complete">
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
