import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Users, Clock, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RAGBadge } from '@/components/dashboard/RAGBadge';

interface TeamMember {
  id: string;
  name: string;
  roles: string[];
  is_active: boolean;
  assigned_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  pending_tasks: number;
}

interface TeamTask {
  id: string;
  name: string;
  due_at: string;
  status: string;
  assignee: {
    name: string;
    roles: string[];
  };
}

// Helper to extract role keys from new role system
const extractRoleKeys = (userPracticeRoles: any): string[] => {
  if (!userPracticeRoles || !Array.isArray(userPracticeRoles)) return [];
  return userPracticeRoles
    .map((upr: any) => upr.practice_roles?.role_catalog?.role_key)
    .filter(Boolean);
};

export default function TeamDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [recentTasks, setRecentTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchTeamData = async () => {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('practice_id')
          .eq('auth_user_id', user.id)
          .single();

        if (!userData) return;

        // Fetch all team members
        const { data: members } = await supabase
          .from('users')
          .select(`
            id,
            name,
            is_active,
            user_practice_roles(
              practice_roles(
                role_catalog(role_key, display_name)
              )
            )
          `)
          .eq('practice_id', userData.practice_id);

        // Fetch process instances with assignee info
        const { data: processInstances } = await supabase
          .from('process_instances')
          .select(`
            *,
            process_templates!inner (
              name
            ),
            users!assignee_id (
              name,
              user_practice_roles(
                practice_roles(
                  role_catalog(role_key, display_name)
                )
              )
            )
          `)
          .eq('practice_id', userData.practice_id);

        if (members) {
          // Calculate task statistics for each team member
          const membersWithStats = members.map(member => {
            const memberTasks = (processInstances || []).filter(
              task => task.assignee_id === member.id
            );

            const completed = memberTasks.filter(t => t.status === 'complete').length;
            const overdue = memberTasks.filter(
              t => t.status !== 'complete' && new Date(t.due_at) < new Date()
            ).length;
            const pending = memberTasks.filter(t => t.status === 'pending').length;

            return {
              id: member.id,
              name: member.name,
              is_active: member.is_active,
              roles: extractRoleKeys((member as any).user_practice_roles),
              assigned_tasks: memberTasks.length,
              completed_tasks: completed,
              overdue_tasks: overdue,
              pending_tasks: pending
            };
          });

          setTeamMembers(membersWithStats);
        }

        // Recent tasks for team overview
        if (processInstances) {
          const tasksWithAssignee = processInstances
            .filter(task => task.users)
            .map(task => ({
              id: task.id,
              name: task.process_templates?.name || 'Unnamed Process',
              due_at: task.due_at,
              status: task.status,
              assignee: {
                name: task.users?.name || 'Unknown',
                roles: extractRoleKeys(task.users?.user_practice_roles)
              }
            }))
            .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
            .slice(0, 10);

          setRecentTasks(tasksWithAssignee);
        }
      } catch (error) {
        console.error('Error fetching team data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [user]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getTaskStatusBadge = (status: string, dueAt: string) => {
    if (status === 'complete') return 'green';
    if (new Date(dueAt) < new Date()) return 'red';
    return 'amber';
  };

  const getMemberPerformanceColor = (member: TeamMember) => {
    if (member.overdue_tasks > 0) return 'text-red-600';
    if (member.pending_tasks > member.completed_tasks) return 'text-amber-600';
    return 'text-green-600';
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

  const totalMembers = teamMembers.length;
  const totalTasks = teamMembers.reduce((sum, member) => sum + member.assigned_tasks, 0);
  const totalCompleted = teamMembers.reduce((sum, member) => sum + member.completed_tasks, 0);
  const totalOverdue = teamMembers.reduce((sum, member) => sum + member.overdue_tasks, 0);

  return (
    <div className="p-4 md:p-6">
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Team Dashboard
            </h1>
            <p className="text-muted-foreground">
              Overview of team performance and task distribution
            </p>
          </div>
        </div>

        {/* Team Summary */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="font-medium">Team Members</h3>
              </div>
              <p className="text-2xl font-bold text-primary mt-2">{totalMembers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium">Total Tasks</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600 mt-2">{totalTasks}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <h3 className="font-medium">Completed</h3>
              </div>
              <p className="text-2xl font-bold text-green-600 mt-2">{totalCompleted}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <h3 className="font-medium">Overdue</h3>
              </div>
              <p className="text-2xl font-bold text-red-600 mt-2">{totalOverdue}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Task distribution and performance overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{member.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {member.roles && member.roles.length > 0 
                              ? member.roles[0].replace('_', ' ').toUpperCase()
                              : 'NO ROLE'}
                          </Badge>
                          <span>•</span>
                          <span>{member.assigned_tasks} tasks</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">{member.completed_tasks} ✓</span>
                        <span className="text-amber-600">{member.pending_tasks} ⏳</span>
                        <span className="text-red-600">{member.overdue_tasks} ⚠️</span>
                      </div>
                      <p className={`text-xs font-medium ${getMemberPerformanceColor(member)}`}>
                        {member.overdue_tasks > 0 ? 'Needs attention' : 
                         member.completed_tasks > member.pending_tasks ? 'On track' : 'Monitor'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Tasks</CardTitle>
              <CardDescription>
                Next tasks due across the team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTasks.length > 0 ? (
                  recentTasks.map((task) => (
                    <div 
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => navigate(`/task/${task.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <RAGBadge status={getTaskStatusBadge(task.status, task.due_at)} />
                        <div>
                          <h4 className="text-sm font-medium">{task.name}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{task.assignee.name}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{new Date(task.due_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No upcoming tasks</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}