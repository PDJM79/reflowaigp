import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Flame, ListChecks, AlertTriangle, CheckCircle, Plus, Shield } from 'lucide-react';
import { FireSafetyAssessmentDialog } from '@/components/fire-safety/FireSafetyAssessmentDialog';
import { FireSafetyActionDialog } from '@/components/fire-safety/FireSafetyActionDialog';
import { FireRiskWizard } from '@/components/fire-safety/FireRiskWizard';
import { COSHHAssessmentDialog } from '@/components/coshh/COSHHAssessmentDialog';
import { useQuery } from '@tanstack/react-query';

export default function FireSafety() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isFRAWizardOpen, setIsFRAWizardOpen] = useState(false);
  const [isCOSHHDialogOpen, setIsCOSHHDialogOpen] = useState(false);
  const [practiceId, setPracticeId] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Fetch practice ID
  const { data: userData } = useQuery({
    queryKey: ['user-practice', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();
      if (data?.practice_id) {
        setPracticeId(data.practice_id);
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch assessments
  const { data: assessments = [], isLoading: assessmentsLoading } = useQuery({
    queryKey: ['fire-safety-assessments', practiceId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('fire_safety_assessments')
        .select('*, assessor:users(name)')
        .eq('practice_id', practiceId)
        .order('assessment_date', { ascending: false });
      return data || [];
    },
    enabled: !!practiceId,
  });

  // Fetch actions
  const { data: actions = [], isLoading: actionsLoading } = useQuery({
    queryKey: ['fire-safety-actions', practiceId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('fire_safety_actions')
        .select('*, assigned_user:users(name)')
        .eq('practice_id', practiceId)
        .order('due_date', { ascending: true });
      return data || [];
    },
    enabled: !!practiceId,
  });

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['fire-safety-tasks', practiceId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('tasks')
        .select('*')
        .eq('practice_id', practiceId)
        .eq('module', 'fire_safety')
        .order('due_at', { ascending: true });
      return data || [];
    },
    enabled: !!practiceId,
  });

  const openTasks = tasks.filter((t: any) => t.status === 'open');
  const completedTasks = tasks.filter((t: any) => t.status === 'complete');
  const overdueTasks = tasks.filter((t: any) => t.status !== 'complete' && new Date(t.due_at) < new Date());
  
  const openActions = actions.filter((a: any) => !a.completed_at);
  const overdueActions = actions.filter((a: any) => !a.completed_at && new Date(a.due_date) < new Date());
  
  const loading = assessmentsLoading || actionsLoading || tasksLoading;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Flame className="h-8 w-8" />
            Fire Safety & Health & Safety
          </h1>
          <p className="text-muted-foreground">Manage fire drills, risk assessments, and H&S compliance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsFRAWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Fire Risk Assessment
          </Button>
          <Button variant="outline" onClick={() => setIsCOSHHDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            COSHH Assessment
          </Button>
          <Button variant="outline" onClick={() => setIsActionDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Action
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assessments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openActions.length}</div>
          </CardContent>
        </Card>

        <Card className={overdueActions.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Overdue Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overdueActions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openTasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading fire safety data...</div>
      ) : (
        <Tabs defaultValue="assessments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="assessments">
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessments</CardTitle>
              </CardHeader>
              <CardContent>
                {assessments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No assessments recorded</p>
                ) : (
                  <div className="space-y-3">
                    {assessments.map((assessment: any) => (
                      <div key={assessment.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium capitalize">{assessment.assessment_type.replace('_', ' ')}</p>
                            <Badge variant={
                              assessment.overall_risk_rating === 'critical' ? 'destructive' :
                              assessment.overall_risk_rating === 'high' ? 'destructive' :
                              assessment.overall_risk_rating === 'medium' ? 'default' : 'secondary'
                            }>
                              {assessment.overall_risk_rating}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(assessment.assessment_date).toLocaleDateString()} • {assessment.assessor?.name}
                          </p>
                          {assessment.summary && (
                            <p className="text-sm text-muted-foreground mt-1">{assessment.summary}</p>
                          )}
                        </div>
                        {assessment.next_assessment_due && (
                          <div className="text-sm text-right">
                            <p className="font-medium">Next Due</p>
                            <p className="text-muted-foreground">
                              {new Date(assessment.next_assessment_due).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle>Safety Actions</CardTitle>
              </CardHeader>
              <CardContent>
                {actions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No actions created</p>
                ) : (
                  <div className="space-y-3">
                    {actions.map((action: any) => (
                      <div key={action.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{action.action_description}</p>
                            <Badge variant={
                              action.severity === 'critical' ? 'destructive' :
                              action.severity === 'high' ? 'destructive' :
                              action.severity === 'medium' ? 'default' : 'secondary'
                            }>
                              {action.severity}
                            </Badge>
                            {action.completed_at && (
                              <Badge variant="outline" className="bg-success/10">Completed</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {action.assigned_user?.name || 'Unassigned'} • Due: {new Date(action.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        {!action.completed_at && new Date(action.due_date) < new Date() && (
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Fire Safety Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <Flame className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No fire safety tasks yet</p>
                    <Button variant="outline" onClick={() => navigate('/task-templates')}>
                      Create Task Template
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tasks.slice(0, 10).map((task: any) => (
                      <div 
                        key={task.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/task/${task.id}`)}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Due: {new Date(task.due_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialogs */}
      <FireRiskWizard
        open={isFRAWizardOpen}
        onClose={() => setIsFRAWizardOpen(false)}
        practiceId={practiceId}
      />
      <COSHHAssessmentDialog
        open={isCOSHHDialogOpen}
        onClose={() => setIsCOSHHDialogOpen(false)}
        practiceId={practiceId}
      />
      <FireSafetyActionDialog
        open={isActionDialogOpen}
        onClose={() => setIsActionDialogOpen(false)}
        practiceId={practiceId}
      />
    </div>
  );
}
