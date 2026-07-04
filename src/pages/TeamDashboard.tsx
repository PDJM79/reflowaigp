import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Users, Clock, CheckCircle, AlertTriangle, User, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RAGBadge } from '@/components/dashboard/RAGBadge';
import { AssignDialog } from '@/components/tasks/AssignDialog';

interface TeamMember {
  id: string;
  name: string;
  role: string;
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
    role: string;
  };
}

const COMPLETED_STATUSES = new Set(['complete', 'closed', 'submitted']);

const formatRole = (role: string) =>
  role ? role.replace(/_/g, ' ').toUpperCase() : 'NO ROLE';

export default function TeamDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [recentTasks, setRecentTasks] = useState<TeamTask[]>([]);
  const [unassigned, setUnassigned] = useState<{ id: string; title: string; dueAt?: string | null; module?: string }[]>([]);
  const [assignTarget, setAssignTarget] = useState<{ id: string; title: string; assigneeId?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchTeamData = useCallback(async () => {
    if (!user?.practiceId) return;

    try {
      setLoading(true);
      setLoadError(false);

      const [usersRes, tasksRes] = await Promise.all([
        fetch(`/api/practices/${user.practiceId}/users`, { credentials: 'include' }),
        fetch(`/api/practices/${user.practiceId}/tasks`, { credentials: 'include' }),
      ]);
      if (!usersRes.ok || !tasksRes.ok) {
        throw new Error('Failed to fetch team data');
      }

      const members = await usersRes.json();
      const tasks = await tasksRes.json();
      const memberList = Array.isArray(members) ? members : [];
      const taskList = Array.isArray(tasks) ? tasks : [];
      const now = new Date();

      const membersWithStats: TeamMember[] = memberList.map((member: any) => {
        const memberTasks = taskList.filter((t: any) => t.assigneeId === member.id);
        const completed = memberTasks.filter((t: any) => COMPLETED_STATUSES.has(t.status)).length;
        const overdue = memberTasks.filter(
          (t: any) => !COMPLETED_STATUSES.has(t.status) && t.dueAt && new Date(t.dueAt) < now
        ).length;
        const pending = memberTasks.length - completed - overdue;

        return {
          id: member.id,
          name: member.name,
          role: member.role || '',
          is_active: member.isActive !== false,
          assigned_tasks: memberTasks.length,
          completed_tasks: completed,
          overdue_tasks: overdue,
          pending_tasks: Math.max(0, pending),
        };
      });

      setTeamMembers(membersWithStats);

      const nameById = new Map<string, any>(memberList.map((m: any) => [m.id, m]));
      const upcoming: TeamTask[] = taskList
        .filter((t: any) => t.assigneeId && !COMPLETED_STATUSES.has(t.status))
        .map((t: any) => ({
          id: t.id,
          name: t.title || 'Untitled task',
          due_at: t.dueAt,
          status: t.status || 'pending',
          assignee: {
            name: nameById.get(t.assigneeId)?.name || 'Unknown',
            role: nameById.get(t.assigneeId)?.role || '',
          },
        }))
        .sort((a, b) => new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime())
        .slice(0, 10);

      setRecentTasks(upcoming);

      // Unassigned logbook occurrences for triage.
      const unassignedRes = await fetch(`/api/practices/${user.practiceId}/unassigned-occurrences`, { credentials: 'include' });
      if (unassignedRes.ok) {
        const occ = await unassignedRes.json();
        setUnassigned((Array.isArray(occ) ? occ : []).map((t: any) => ({ id: t.id, title: t.title, dueAt: t.dueAt, module: t.module })));
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchTeamData();
  }, [user, fetchTeamData]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getTaskStatusBadge = (status: string, dueAt: string) => {
    if (COMPLETED_STATUSES.has(status)) return 'green';
    if (dueAt && new Date(dueAt) < new Date()) return 'red';
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
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-8 w-56" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 md:p-6">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <div>
                <p className="font-medium">Failed to load team data</p>
                <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
              </div>
              <Button variant="outline" onClick={fetchTeamData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
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

        {/* Unassigned logbook occurrences — triage */}
        {unassigned.length > 0 && (
          <Card className="mb-6 border-amber-300 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Unassigned occurrences ({unassigned.length})
              </CardTitle>
              <CardDescription>Generated logbook tasks with no assignee — assign each to a team member.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {unassigned.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{o.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.module ? `${o.module.replace(/_/g, ' ')} · ` : ''}
                        {o.dueAt ? `due ${new Date(o.dueAt).toLocaleDateString()}` : 'no due date'}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setAssignTarget({ id: o.id, title: o.title, assigneeId: null })}>
                      <User className="h-4 w-4 mr-1" /> Assign
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                {teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No team members yet — add users in User Management</p>
                  </div>
                ) : (
                  teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{member.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {formatRole(member.role)}
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
                  ))
                )}
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
                            <span>{task.due_at ? new Date(task.due_at).toLocaleDateString() : 'No due date'}</span>
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

      <AssignDialog
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        onAssigned={fetchTeamData}
        task={assignTarget}
      />
    </div>
  );
}
