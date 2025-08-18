import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertTriangle, XCircle, User, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTaskData } from '@/hooks/useTaskData';
import { AppHeader } from '@/components/layout/AppHeader';
import { RAGBadge, RAGStatus } from './RAGBadge';
import { supabase } from '@/integrations/supabase/client';

export function UserDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { userTasks, otherTasks, loading } = useTaskData();
  const [isPracticeManager, setIsPracticeManager] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchUserInfo = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('name, is_practice_manager')
          .eq('auth_user_id', user.id)
          .single();

        if (data) {
          setUserName(data.name);
          setIsPracticeManager(data.is_practice_manager);
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo();
  }, [user]);

  const handleTaskClick = (taskId: string) => {
    console.log('Navigate to task:', taskId);
    window.location.href = `/task/${taskId}`;
  };

  const getStatusIcon = (status: RAGStatus) => {
    switch (status) {
      case 'green':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'amber':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'red':
        return <XCircle className="h-4 w-4 text-error" />;
    }
  };

  const getButtonText = (status: RAGStatus) => {
    if (status === 'green') return 'Continue';
    if (status === 'red') return 'Urgent';
    return 'Start';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Welcome back, {userName}!</h1>
          </div>
          <div className="flex items-center gap-2">
            {isPracticeManager && (
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Change Roles/Designations
              </Button>
            )}
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Your Tasks */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Your Tasks Today
                </CardTitle>
                <CardDescription>
                  Processes assigned to you that need attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userTasks.length > 0 ? (
                  userTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleTaskClick(task.id)}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(task.status)}
                        <div>
                          <h3 className="font-medium">{task.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {task.dueAt}
                            </span>
                            <span>{task.progress}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <RAGBadge status={task.status} />
                        <Button size="sm" variant={task.status === 'red' ? 'destructive' : 'default'}>
                          {getButtonText(task.status)}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                    <p>No tasks assigned to you today!</p>
                    <p className="text-sm">Great job staying on top of your processes.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Other Tasks - visible to Practice Managers */}
            {isPracticeManager && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Other Tasks and Status
                  </CardTitle>
                  <CardDescription>
                    Overview of all practice processes and their current status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {otherTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleTaskClick(task.id)}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(task.status)}
                        <div>
                          <h3 className="font-medium">{task.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {task.dueAt}
                            </span>
                            <span>{task.progress}</span>
                            <Badge variant="outline" className="text-xs">
                              {task.assigneeName}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <RAGBadge status={task.status} />
                        <span className="text-sm text-muted-foreground">
                          {task.assigneeRole}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Process Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">On Track</span>
                    <div className="flex items-center gap-2">
                      <RAGBadge status="green" />
                      <span className="text-sm font-medium">
                        {[...userTasks, ...otherTasks].filter(t => t.status === 'green').length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">At Risk</span>
                    <div className="flex items-center gap-2">
                      <RAGBadge status="amber" />
                      <span className="text-sm font-medium">
                        {[...userTasks, ...otherTasks].filter(t => t.status === 'amber').length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overdue</span>
                    <div className="flex items-center gap-2">
                      <RAGBadge status="red" />
                      <span className="text-sm font-medium">
                        {[...userTasks, ...otherTasks].filter(t => t.status === 'red').length}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/processes')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    View All Processes
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/risk-register')}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Risk Register
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/team')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Team Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
