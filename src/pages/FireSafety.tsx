import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Flame, ListChecks, AlertTriangle, CheckCircle, Plus, Shield, Info } from 'lucide-react';
import { FireSafetyAssessmentDialog } from '@/components/fire-safety/FireSafetyAssessmentDialog';
import { FireSafetyActionDialog } from '@/components/fire-safety/FireSafetyActionDialog';
import { FireRiskWizard } from '@/components/fire-safety/FireRiskWizard';
import { COSHHAssessmentDialog } from '@/components/coshh/COSHHAssessmentDialog';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';

export default function FireSafety() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isFRAWizardOpen, setIsFRAWizardOpen] = useState(false);
  const [isCOSHHDialogOpen, setIsCOSHHDialogOpen] = useState(false);

  const practiceId = user?.practiceId || '';

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['fire-safety-tasks', practiceId],
    queryFn: async () => {
      const response = await fetch(`/api/practices/${practiceId}/tasks?module=fire_safety`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!practiceId,
  });

  const assessments: any[] = [];
  const actions: any[] = [];
  const assessmentsLoading = false;
  const actionsLoading = false;

  const openTasks = tasks.filter((t: any) => t.status === 'open');
  const completedTasks = tasks.filter((t: any) => t.status === 'complete');
  const overdueTasks = tasks.filter((t: any) => t.status !== 'complete' && new Date(t.dueAt) < new Date());
  
  const openActions = actions.filter((a: any) => !a.completedAt);
  const overdueActions = actions.filter((a: any) => !a.completedAt && new Date(a.dueDate) < new Date());
  
  const loading = assessmentsLoading || actionsLoading || tasksLoading;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Flame className="h-8 w-8" />
              Fire Safety & Health & Safety
            </h1>
          </div>
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
                <div className="text-center py-8">
                  <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2 font-medium">Fire safety assessments data will be available soon.</p>
                  <p className="text-sm text-muted-foreground">This feature is being migrated to the new system.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle>Safety Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2 font-medium">Fire safety actions data will be available soon.</p>
                  <p className="text-sm text-muted-foreground">This feature is being migrated to the new system.</p>
                </div>
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
                          Due: {new Date(task.dueAt).toLocaleDateString()}
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

      <FireRiskWizard
        open={isFRAWizardOpen}
        onOpenChange={setIsFRAWizardOpen}
        onSuccess={() => {
          setIsFRAWizardOpen(false);
        }}
      />
      <COSHHAssessmentDialog
        open={isCOSHHDialogOpen}
        onOpenChange={setIsCOSHHDialogOpen}
        onSuccess={() => {
          setIsCOSHHDialogOpen(false);
        }}
      />
      <FireSafetyActionDialog
        open={isActionDialogOpen}
        onClose={() => setIsActionDialogOpen(false)}
        practiceId={practiceId}
      />
    </div>
  );
}
