import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AppHeader } from '@/components/layout/AppHeader';
import { ArrowLeft, Users, Clock, CheckCircle, AlertTriangle, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RAGBadge } from '@/components/dashboard/RAGBadge';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  assigned_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  pending_tasks: number;
}

interface TeamTask {
  id: string;
  title: string;
  dueAt: string;
  status: string;
  assigneeName: string;
}

export default function TeamDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [recentTasks, setRecentTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.practiceId) return;

    const fetchTeamData = async () => {
      try {
        const [usersRes, tasksRes] = await Promise.all([
          fetch(`/api/practices/${user.practiceId}/users`, { credentials: 'include' }),
          fetch(`/api/practices/${user.practiceId}/tasks`, { credentials: 'include' }),
        ]);

        const usersData = usersRes.ok ? await usersRes.json() : [];
        const tasksData = tasksRes.ok ? await tasksRes.json() : [];

        const membersWithStats = (usersData || []).map((member: any) => {
          const memberTasks = (tasksData || []).filter(
            (task: any) => task.assignedToUserId === member.id
          );

          const completed = memberTasks.filter((t: any) => t.status === 'complete').length;
          const overdue = memberTasks.filter(
            (t: any) => t.status !== 'complete' && new Date(t.dueAt) < new Date()
          ).length;
          const pending = memberTasks.filter((t: any) => t.status === 'pending').length;

          return {
            id: member.id,
            name: member.name,
            role: member.role || 'staff',
            isActive: member.isActive,
            assigned_tasks: memberTasks.length,
            completed_tasks: completed,
            overdue_tasks: overdue,
            pending_tasks: pending,
          };
        });

        setTeamMembers(membersWithStats);

        const tasksWithAssignee = (tasksData || [])
          .map((task: any) => {
            const assignee = (usersData || []).find((u: any) => u.id === task.assignedToUserId);
            return {
              id: task.id,
              title: task.title || 'Unnamed Task',
              dueAt: task.dueAt,
              status: task.status,
              assigneeName: assignee?.name || 'Unassigned',
            };
          })
          .filter((t: any) => t.status !== 'complete')
          .sort((a: any, b: any) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
          .slice(0, 10);

        setRecentTasks(tasksWithAssignee);
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
      <div className="min-h-screen bg-background">
        <AppHeader />
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
    <div className="min-h-screen bg-background">
      <AppHeader />
      
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
                            {member.role.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span>•</span>
                          <span>{member.assigned_tasks} tasks</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-600">{member.completed_tasks} done</span>
                        <span className="text-amber-600">{member.pending_tasks} pending</span>
                        <span className="text-red-600">{member.overdue_tasks} overdue</span>
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
                        <RAGBadge status={getTaskStatusBadge(task.status, task.dueAt)} />
                        <div>
                          <h4 className="text-sm font-medium">{task.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{task.assigneeName}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>{new Date(task.dueAt).toLocaleDateString()}</span>
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