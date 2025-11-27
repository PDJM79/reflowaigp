import * as React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { format, isThisMonth, isPast, isFuture } from 'date-fns';
import { ReadyForAudit } from '@/components/dashboard/ReadyForAudit';
import { PoliciesNeedingAcknowledgment } from '@/components/dashboard/PoliciesNeedingAcknowledgment';
import { AITaskSuggestions } from '@/components/dashboard/AITaskSuggestions';
import { AIComplianceScores } from '@/components/dashboard/AIComplianceScores';

type Task = {
  id: string;
  title: string;
  description: string;
  due_at: string;
  status: string;
  priority: string;
  module: string;
  requires_photo: boolean;
};

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [userRole, setUserRole] = React.useState<string>('');
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;

    const fetchUserAndTasks = async () => {
      // Get user and role
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      // Get user's primary role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (userData && roleData) {
        setUserRole(roleData.role);

        // Fetch tasks assigned to this user
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to_user_id', userData.id)
          .order('due_at', { ascending: true });

        setTasks(tasksData || []);
      }
      setLoading(false);
    };

    fetchUserAndTasks();
  }, [user]);

  const isManager = userRole === 'practice_manager' || userRole === 'administrator' || userRole === 'group_manager';

  // Filter tasks for current month, completed, and timed out
  const currentMonthTasks = tasks.filter(task => 
    isThisMonth(new Date(task.due_at)) && 
    !['closed', 'submitted'].includes(task.status)
  );

  const completedTasks = tasks.filter(task => 
    ['closed', 'submitted'].includes(task.status)
  );

  const timedOutTasks = tasks.filter(task => 
    isPast(new Date(task.due_at)) && 
    !['closed', 'submitted'].includes(task.status)
  );

  const getStatusBadge = (task: Task) => {
    const dueDate = new Date(task.due_at);
    const now = new Date();
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (task.status === 'overdue' || (isPast(dueDate) && task.status !== 'closed')) {
      return <Badge variant="destructive">{t('tasks.status.overdue')}</Badge>;
    }
    
    if (daysUntilDue <= 2) {
      return <Badge className="bg-orange-500">{t('tasks.due_soon')}</Badge>;
    }

    return <Badge variant="secondary">{t('tasks.on_track')}</Badge>;
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <CardDescription>{task.description}</CardDescription>
          </div>
          {getStatusBadge(task)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(task.due_at), 'PPP')}</span>
            </div>
            <Badge variant="outline">{task.module}</Badge>
            {task.requires_photo && (
              <Badge variant="outline" className="bg-blue-50">Photo Required</Badge>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" className="flex-1">Complete Task</Button>
            <Button size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Send Back
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  // Manager/Admin Dashboard
  if (isManager) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('home.welcome')}</h1>
          <p className="text-muted-foreground">Practice Manager Dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">+3 from last week</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">5</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87%</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Ready for Audit Section */}
        <ReadyForAudit />

        {/* Policies Needing Acknowledgment */}
        <PoliciesNeedingAcknowledgment />

        {/* AI Components */}
        <div className="grid gap-6 md:grid-cols-2">
          <AITaskSuggestions />
          <AIComplianceScores />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('home.due_tasks')}</CardTitle>
            <CardDescription>Tasks requiring attention across your practice</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Task management features coming soon...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Standard User Dashboard
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('home.welcome')}</h1>
        <p className="text-muted-foreground">{t('home.my_todos')}</p>
      </div>

      {/* Policies Widget for Standard Users */}
      <PoliciesNeedingAcknowledgment />

      <Tabs defaultValue="current" className="w-full">
        <TabsList>
          <TabsTrigger value="current">
            <Clock className="h-4 w-4 mr-2" />
            {t('home.my_todos')} ({currentMonthTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {t('home.completed')} ({completedTasks.length})
          </TabsTrigger>
          <TabsTrigger value="timedout">
            <XCircle className="h-4 w-4 mr-2" />
            {t('home.timed_out')} ({timedOutTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4 mt-6">
          {currentMonthTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">{t('home.all_caught_up')}</p>
                <p className="text-muted-foreground">{t('home.no_tasks')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {currentMonthTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-6">
          {completedTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No completed tasks yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {completedTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timedout" className="space-y-4 mt-6">
          {timedOutTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No timed-out tasks</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {timedOutTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
