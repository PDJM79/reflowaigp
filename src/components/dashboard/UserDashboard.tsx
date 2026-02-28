import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertTriangle, XCircle, User, Settings, Loader2, Info, Crown, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMasterUser } from '@/hooks/useMasterUser';
import { useTaskData } from '@/hooks/useTaskData';
import { useCapabilities } from '@/hooks/useCapabilities';
import { RAGBadge, RAGStatus } from './RAGBadge';
import { RoleManagement } from '@/components/admin/RoleManagement';
import { ReadyForAudit } from '@/components/dashboard/ReadyForAudit';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function UserDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isMasterUser, selectedPracticeId, selectedPracticeName, clearSelectedPractice } = useMasterUser();
  const { userTasks, otherTasks, loading } = useTaskData();
  const { hasCapability, userRoles: capabilityRoles } = useCapabilities();
  const [userRole, setUserRole] = useState('');
  const [allProcessesByRole, setAllProcessesByRole] = useState<any[]>([]);
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [passingTask, setPassingTask] = useState<string | null>(null);

  // Use capability system for access control
  const canViewDashboards = hasCapability('view_dashboards') || isMasterUser;
  const canManageRoles = hasCapability('assign_roles') || isMasterUser;

  // All user identity data comes from the session — no extra Supabase lookup needed
  const effectivePracticeId = (isMasterUser && selectedPracticeId) ? selectedPracticeId : user?.practiceId;

  useEffect(() => {
    if (!user || !effectivePracticeId) return;

    const fetchProcessTemplates = async () => {
      try {
        const displayRole = capabilityRoles[0]?.practice_role?.role_catalog?.display_name ||
                            (canViewDashboards ? 'Manager' : 'Staff');
        setUserRole(displayRole);

        const { data: templates } = await supabase
          .from('process_templates')
          .select('name, responsible_role, frequency')
          .eq('practice_id', effectivePracticeId);

        setAllProcessesByRole(templates || []);
      } catch (error) {
        console.error('Error fetching process templates:', error);
      }
    };

    fetchProcessTemplates();
  }, [user, effectivePracticeId, capabilityRoles, canViewDashboards]);

  const handleTaskClick = (taskId: string) => {
    console.log('Navigate to task:', taskId);
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

  const passTaskToPracticeManager = async (taskId: string) => {
    if (!user) return;
    
    setPassingTask(taskId);
    try {
      // practice_id comes from the session — no extra DB lookup needed
      const practiceId = effectivePracticeId;
      if (!practiceId) {
        toast.error('Could not determine practice');
        return;
      }

      // Find the practice manager via new role system first
      const { data: pmViaRole } = await supabase
        .from('user_practice_roles')
        .select(`
          user_id,
          users!inner(id, practice_id),
          practice_roles!inner(
            role_catalog!inner(role_key)
          )
        `)
        .eq('users.practice_id', practiceId)
        .eq('practice_roles.role_catalog.role_key', 'practice_manager')
        .limit(1)
        .maybeSingle();

      let practiceManagerId: string | null = null;

      if (pmViaRole?.users) {
        practiceManagerId = (pmViaRole.users as any).id;
      } else {
        // Fallback to is_practice_manager flag for backward compatibility
        const { data: fallbackPM } = await supabase
          .from('users')
          .select('id')
          .eq('practice_id', practiceId)
          .eq('is_practice_manager', true)
          .limit(1)
          .maybeSingle();
        
        practiceManagerId = fallbackPM?.id || null;
      }

      if (!practiceManagerId) {
        toast.error('No practice manager found');
        return;
      }

      // Update the task to assign it to the practice manager
      const { error } = await supabase
        .from('process_instances')
        .update({ assignee_id: practiceManagerId })
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
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {isMasterUser && <Crown className="h-6 w-6 text-yellow-500" />}
            <User className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">
                Welcome back, {user?.name}!
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
            {canManageRoles && (
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
                        {!canViewDashboards && (
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

            {/* Ready for Audit - visible to users with dashboard access */}
            {canViewDashboards && (
              <ReadyForAudit />
            )}

            {/* Other Tasks - visible to users with dashboard access */}
            {canViewDashboards && (
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

          </div>
        </div>
      </div>

      <RoleManagement 
        open={showRoleManagement} 
        onOpenChange={setShowRoleManagement} 
      />

    </div>
  );
}
