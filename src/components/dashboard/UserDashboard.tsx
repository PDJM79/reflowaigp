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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function UserDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isMasterUser, selectedPracticeId, selectedPracticeName, clearSelectedPractice } = useMasterUser();
  const { userTasks, otherTasks, loading } = useTaskData();
  const [isPracticeManager, setIsPracticeManager] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userPracticeId, setUserPracticeId] = useState('');
  const [allProcessesByRole, setAllProcessesByRole] = useState<any[]>([]);
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [showCreateMasterUser, setShowCreateMasterUser] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [assigningTasks, setAssigningTasks] = useState(false);
  const [creatingAccounts, setCreatingAccounts] = useState(false);
  const [passingTask, setPassingTask] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchUserInfo = async () => {
      try {
        console.log('Fetching user info for auth user:', user.id);
        const { data, error } = await supabase
          .from('users')
          .select('name, is_practice_manager, role, practice_id, is_master_user')
          .eq('auth_user_id', user.id)
          .single();

        console.log('User dashboard data:', data, 'Error:', error);
        
        if (data) {
          setUserName(data.name);
          setIsPracticeManager(data.is_practice_manager);
          setUserRole(data.role);
          
          // For master users, use selected practice, otherwise use user's practice
          const practiceId = isMasterUser && selectedPracticeId ? selectedPracticeId : data.practice_id;
          setUserPracticeId(practiceId);

          console.log('User role:', data.role, 'Practice ID:', practiceId, 'Is Master:', data.is_master_user);

          // Fetch all process templates where the user's role is responsible
          const { data: templates, error: templatesError } = await supabase
            .from('process_templates')
            .select('name, responsible_role, frequency')
            .eq('practice_id', practiceId)
            .eq('responsible_role', data.role);

          console.log('Process templates for role:', templates, 'Error:', templatesError);
          setAllProcessesByRole(templates || []);
        } else {
          console.log('No user data found in dashboard');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserInfo();
  }, [user, isMasterUser, selectedPracticeId]);

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

  const createMissingAccounts = async () => {
    if (!userPracticeId) return;
    
    setCreatingAccounts(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-missing-accounts', {
        body: { practice_id: userPracticeId }
      });

      if (error) {
        console.error('Error creating accounts:', error);
        toast.error('Failed to create user accounts');
        return;
      }

      const results = data.results || [];
      const successful = results.filter((r: any) => r.success);
      const failed = results.filter((r: any) => !r.success);

      if (successful.length > 0) {
        toast.success(`Successfully created ${successful.length} user accounts!`);
      }
      if (failed.length > 0) {
        toast.error(`Failed to create ${failed.length} accounts. Check console for details.`);
        console.error('Failed accounts:', failed);
      }

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
      console.log('Creating initial processes for practice:', userPracticeId);
      
      const { data, error } = await supabase.functions.invoke('create-initial-processes', {
        body: { practice_id: userPracticeId }
      });

      console.log('Create initial processes response:', data, 'Error:', error);

      if (error) {
        console.error('Error creating initial processes:', error);
        toast.error(`Failed to create initial processes: ${error.message}`);
        return;
      }

      toast.success(`Created ${data?.process_instances_created || 0} tasks for all users`);
      
      // Refresh the page to show the new tasks
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error creating initial processes:', error);
      toast.error('Failed to create initial processes');
    }
  };

  // Auto-create tasks if none exist and user is practice manager
  useEffect(() => {
    if (isPracticeManager && userTasks.length === 0 && otherTasks.length === 0 && !loading && userPracticeId) {
      console.log('No tasks found, auto-creating initial processes...');
      createInitialProcesses();
    }
  }, [isPracticeManager, userTasks.length, otherTasks.length, loading, userPracticeId]);

  const assignAllTasksToMe = async () => {
    if (!user) return;
    
    setAssigningTasks(true);
    try {
      // Get the current user's ID from the users table
      const { data: userData } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) {
        toast.error('Could not find user data');
        return;
      }

      // Update all process instances in the practice to assign to current user
      const { error } = await supabase
        .from('process_instances')
        .update({ assignee_id: userData.id })
        .eq('practice_id', userData.practice_id);

      if (error) {
        console.error('Error assigning tasks:', error);
        toast.error('Failed to assign tasks');
        return;
      }

      toast.success('All tasks have been assigned to you!');
      // Refresh the page to show updated task assignments
      window.location.reload();
    } catch (error) {
      console.error('Error assigning tasks:', error);
      toast.error('Failed to assign tasks');
    } finally {
      setAssigningTasks(false);
    }
  };

  const passTaskToPracticeManager = async (taskId: string) => {
    if (!user) return;
    
    setPassingTask(taskId);
    try {
      // Get the current user's practice ID
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) {
        toast.error('Could not find user data');
        return;
      }

      // Find the practice manager for this practice
      const { data: practiceManager } = await supabase
        .from('users')
        .select('id')
        .eq('practice_id', userData.practice_id)
        .eq('is_practice_manager', true)
        .single();

      if (!practiceManager) {
        toast.error('No practice manager found');
        return;
      }

      // Update the task to assign it to the practice manager
      const { error } = await supabase
        .from('process_instances')
        .update({ assignee_id: practiceManager.id })
        .eq('id', taskId);

      if (error) {
        console.error('Error passing task:', error);
        toast.error('Failed to pass task to practice manager');
        return;
      }

      toast.success('Task passed to practice manager!');
      // Refresh the page to show updated task assignments
      window.location.reload();
    } catch (error) {
      console.error('Error passing task:', error);
      toast.error('Failed to pass task to practice manager');
    } finally {
      setPassingTask(null);
    }
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
            {isMasterUser && <Crown className="h-6 w-6 text-yellow-500" />}
            <User className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">
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
              >
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
                        {!isPracticeManager && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              passTaskToPracticeManager(task.id);
                            }}
                            disabled={passingTask === task.id}
                          >
                            {passingTask === task.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ArrowRight className="h-3 w-3" />
                            )}
                            Pass to PM
                          </Button>
                        )}
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

            {/* Ready for Audit - visible to Practice Managers and Master Users */}
            {(isPracticeManager || isMasterUser) && (
              <ReadyForAudit />
            )}

            {/* Other Tasks - visible to Practice Managers and Master Users */}
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
                    <span className="text-sm">Completed</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">
                        {[...userTasks, ...otherTasks].filter(t => t.progress === 'Complete').length}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">On Track</span>
                    <div className="flex items-center gap-2">
                      <RAGBadge status="green" />
                      <span className="text-sm font-medium">
                        {[...userTasks, ...otherTasks].filter(t => t.status === 'green' && t.progress !== 'Complete').length}
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
                            {allProcessesByRole.map((process, index) => (
                              <li key={index} className="text-sm text-blue-700 dark:text-blue-300">
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
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={assignAllTasksToMe}
                    disabled={assigningTasks}
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
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Create Master User
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setShowPasswordReset(true)}
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
