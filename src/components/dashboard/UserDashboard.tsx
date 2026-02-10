import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertTriangle, XCircle, User, Settings, Loader2, UserPlus, Info, Crown, Building2, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMasterUser } from '@/hooks/useMasterUser';
import { useTaskData } from '@/hooks/useTaskData';
import { AppHeader } from '@/components/layout/AppHeader';
import { RAGBadge, RAGStatus } from './RAGBadge';
import { RoleManagement } from '@/components/admin/RoleManagement';
import { CreateMasterUser } from '@/components/admin/CreateMasterUser';
import { PasswordReset } from '@/components/admin/PasswordReset';
import { ReadyForAudit } from '@/components/dashboard/ReadyForAudit';
import { toast } from 'sonner';

export function UserDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isMasterUser, selectedPracticeId, selectedPracticeName, clearSelectedPractice } = useMasterUser();
  const { userTasks, otherTasks, loading } = useTaskData();
  const [allProcessesByRole, setAllProcessesByRole] = useState<any[]>([]);
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [showCreateMasterUser, setShowCreateMasterUser] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [assigningTasks, setAssigningTasks] = useState(false);
  const [creatingAccounts, setCreatingAccounts] = useState(false);
  const [passingTask, setPassingTask] = useState<string | null>(null);

  const isPracticeManager = user?.isPracticeManager || false;
  const userName = user?.name || '';
  const userRole = user?.role || '';
  const userPracticeId = (isMasterUser && selectedPracticeId) ? selectedPracticeId : (user?.practiceId || '');

  useEffect(() => {
    if (!user?.practiceId || !userPracticeId) return;

    const fetchProcessTemplates = async () => {
      try {
        const response = await fetch(`/api/practices/${userPracticeId}/process-templates`, {
          credentials: 'include',
        });
        if (response.ok) {
          const templates = await response.json();
          const filtered = templates.filter((t: any) => t.responsibleRole === userRole);
          setAllProcessesByRole(filtered);
        }
      } catch (error) {
        console.error('Error fetching process templates:', error);
      }
    };

    fetchProcessTemplates();
  }, [user, isMasterUser, selectedPracticeId, userPracticeId, userRole]);

  const handleTaskClick = (taskId: string) => {
    navigate(`/task/${taskId}`);
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

  const createMissingAccounts = async () => {
    if (!userPracticeId) return;
    
    setCreatingAccounts(true);
    try {
      toast.info('Account creation feature is not yet available via API.');
    } catch (error) {
      console.error('Error creating accounts:', error);
      toast.error('Failed to create user accounts');
    } finally {
      setCreatingAccounts(false);
    }
  };

  const createInitialProcesses = async () => {
    if (!userPracticeId) return;
    
    try {
      toast.info('Process creation feature is not yet available via API.');
    } catch (error) {
      console.error('Error creating initial processes:', error);
      toast.error('Failed to create initial processes');
    }
  };

  useEffect(() => {
    if (isPracticeManager && userTasks.length === 0 && otherTasks.length === 0 && !loading && userPracticeId) {
      console.log('No tasks found for practice manager');
    }
  }, [isPracticeManager, userTasks.length, otherTasks.length, loading, userPracticeId]);

  const assignAllTasksToMe = async () => {
    if (!user?.practiceId) return;
    
    setAssigningTasks(true);
    try {
      toast.info('Task assignment feature is not yet available via API.');
    } catch (error) {
      console.error('Error assigning tasks:', error);
      toast.error('Failed to assign tasks');
    } finally {
      setAssigningTasks(false);
    }
  };

  const passTaskToPracticeManager = async (taskId: string) => {
    if (!user?.practiceId) return;
    
    setPassingTask(taskId);
    try {
      const usersResponse = await fetch(`/api/practices/${userPracticeId}/users`, {
        credentials: 'include',
      });

      if (!usersResponse.ok) {
        toast.error('Failed to find practice manager');
        return;
      }

      const users = await usersResponse.json();
      const practiceManager = users.find((u: any) => u.isPracticeManager);

      if (!practiceManager) {
        toast.error('No practice manager found');
        return;
      }

      toast.info('Task reassignment feature is not yet fully available via API.');
    } catch (error) {
      console.error('Error passing task:', error);
      toast.error('Failed to pass task to practice manager');
    } finally {
      setPassingTask(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background" data-testid="user-dashboard-loading">
        <AppHeader />
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="user-dashboard">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {isMasterUser && <Crown className="h-6 w-6 text-yellow-500" />}
            <User className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-user-welcome">
                Welcome back, {userName}!
                {isMasterUser && <Badge variant="secondary" className="ml-2">Master Admin</Badge>}
              </h1>
              {isMasterUser && selectedPracticeName && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Building2 className="h-4 w-4" />
                  Managing: {selectedPracticeName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isMasterUser && (
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => {
                  clearSelectedPractice();
                  window.location.reload();
                }}
                data-testid="button-switch-practice"
              >
                <Building2 className="h-4 w-4" />
                Switch Practice
              </Button>
            )}
            {(isPracticeManager || isMasterUser) && (
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => setShowRoleManagement(true)}
                data-testid="button-change-roles"
              >
                <Settings className="h-4 w-4" />
                Change Roles/Designations
              </Button>
            )}
            <Button variant="outline" onClick={signOut} data-testid="button-sign-out">
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
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
                      data-testid={`card-user-task-${task.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(task.status)}
                        <div>
                          <h3 className="font-medium" data-testid={`text-task-name-${task.id}`}>{task.name}</h3>
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
                        {!isPracticeManager && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              passTaskToPracticeManager(task.id);
                            }}
                            disabled={passingTask === task.id}
                            data-testid={`button-pass-task-${task.id}`}
                          >
                            {passingTask === task.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ArrowRight className="h-3 w-3" />
                            )}
                            Pass to PM
                          </Button>
                        )}
                        <Button size="sm" variant={task.status === 'red' ? 'destructive' : 'default'} data-testid={`button-action-task-${task.id}`}>
                          {getButtonText(task.status)}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-tasks">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                    <p>No tasks assigned to you today!</p>
                    <p className="text-sm">Great job staying on top of your processes.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {(isPracticeManager || isMasterUser) && (
              <ReadyForAudit />
            )}

            {(isPracticeManager || isMasterUser) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Other Tasks and Status
                  </CardTitle>
                  <CardDescription>
                    Overview of all audit processes and their current status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {otherTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleTaskClick(task.id)}
                      data-testid={`card-other-task-${task.id}`}
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

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Process Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Completed</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium" data-testid="text-completed-count">
                        {[...userTasks, ...otherTasks].filter(t => t.progress === 'Complete').length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">On Track</span>
                    <div className="flex items-center gap-2">
                      <RAGBadge status="green" />
                      <span className="text-sm font-medium" data-testid="text-on-track-count">
                        {[...userTasks, ...otherTasks].filter(t => t.status === 'green' && t.progress !== 'Complete').length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">At Risk</span>
                    <div className="flex items-center gap-2">
                      <RAGBadge status="amber" />
                      <span className="text-sm font-medium" data-testid="text-at-risk-count">
                        {[...userTasks, ...otherTasks].filter(t => t.status === 'amber').length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overdue</span>
                    <div className="flex items-center gap-2">
                      <RAGBadge status="red" />
                      <span className="text-sm font-medium" data-testid="text-overdue-count">
                        {[...userTasks, ...otherTasks].filter(t => t.status === 'red').length}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Process Responsibilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Process Schedule Information
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        As tasks become ready to be completed, they will appear in your schedule 1 week before they're due.
                      </p>
                      {allProcessesByRole.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                            You are responsible for these processes:
                          </p>
                          <ul className="space-y-1">
                            {allProcessesByRole.map((process: any, index: number) => (
                              <li key={index} className="text-sm text-blue-700 dark:text-blue-300" data-testid={`text-process-${index}`}>
                                • {process.name} ({process.frequency})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
                    data-testid="button-view-processes"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    View All Processes
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/risk-register')}
                    data-testid="button-risk-register"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Risk Register
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/team')}
                    data-testid="button-team-dashboard"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Team Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={assignAllTasksToMe}
                    disabled={assigningTasks}
                    data-testid="button-assign-all-tasks"
                  >
                    {assigningTasks ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Assign All Tasks to Me
                  </Button>
                  {(isPracticeManager || isMasterUser) && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={createInitialProcesses}
                      data-testid="button-create-tasks"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Create Tasks for All Users
                    </Button>
                  )}
                  {(isPracticeManager || isMasterUser) && (
                    <>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setShowCreateMasterUser(true)}
                        data-testid="button-create-master-user"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Create Master User
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setShowPasswordReset(true)}
                        data-testid="button-reset-password"
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Reset User Password
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showRoleManagement && (
        <RoleManagement onClose={() => setShowRoleManagement(false)} />
      )}
      
      {showCreateMasterUser && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="absolute -top-2 -right-2 z-10"
              onClick={() => setShowCreateMasterUser(false)}
              data-testid="button-close-create-master"
            >
              ×
            </Button>
            <CreateMasterUser />
          </div>
        </div>
      )}

      {showPasswordReset && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="absolute -top-2 -right-2 z-10"
              onClick={() => setShowPasswordReset(false)}
              data-testid="button-close-password-reset"
            >
              ×
            </Button>
            <PasswordReset />
          </div>
        </div>
      )}
    </div>
  );
}
