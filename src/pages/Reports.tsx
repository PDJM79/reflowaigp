import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Filter,
  CalendarDays,
  List,
  TrendingUp
} from 'lucide-react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, isSameDay, isAfter, isBefore } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string;
  module: string;
  status: string;
  priority: string;
  due_at: string;
  assigned_to_user_id: string;
  created_at: string;
  assignedUser?: {
    name: string;
  } | null;
}

export default function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasCapability } = useCapabilities();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [analytics, setAnalytics] = useState<{
    modules: Array<{ module: string; expected: number; completed_on_time: number; completed_late: number; overdue_open: number; missed: number; score: number | null }>;
    trends: Record<string, number | null>;
    compliance: number | null;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'timeline'>('timeline');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Check capability for viewing all tasks
  const canSeeAllTasks = hasCapability('view_dashboards');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchTasks();
  }, [user, navigate, selectedModule, selectedPriority]);

  const fetchTasks = async () => {
    try {
      if (!user?.practiceId) return;
      setLoadError(false);

      const [tasksRes, usersRes] = await Promise.all([
        fetch(`/api/practices/${user.practiceId}/tasks`, { credentials: 'include' }),
        fetch(`/api/practices/${user.practiceId}/users`, { credentials: 'include' }),
      ]);
      if (!tasksRes.ok) throw new Error('Failed to fetch tasks');

      const rawTasks = await tasksRes.json();
      const rawUsers = usersRes.ok ? await usersRes.json() : [];
      const nameById = new Map<string, string>(
        (Array.isArray(rawUsers) ? rawUsers : []).map((u: any) => [u.id, u.name])
      );

      const mapped: Task[] = (Array.isArray(rawTasks) ? rawTasks : [])
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          module: t.module || '',
          status: t.status || 'pending',
          priority: t.priority || 'medium',
          due_at: t.dueAt,
          assigned_to_user_id: t.assigneeId,
          created_at: t.createdAt || '',
          assignedUser: t.assigneeId ? { name: nameById.get(t.assigneeId) || 'Unknown' } : null,
        }))
        .filter((t) => selectedModule === 'all' || t.module === selectedModule)
        .filter((t) => selectedPriority === 'all' || t.priority === selectedPriority)
        .sort((a, b) => new Date(a.due_at || 0).getTime() - new Date(b.due_at || 0).getTime());

      setTasks(mapped);

      // Phase 6: server-computed expected-vs-actual per module + compliance trends.
      const moduleQ = selectedModule !== 'all' ? `?module=${encodeURIComponent(selectedModule)}` : '';
      const [mbRes, cRes] = await Promise.all([
        fetch(`/api/practices/${user.practiceId}/analytics/module-breakdown${moduleQ}`, { credentials: 'include' }),
        fetch(`/api/practices/${user.practiceId}/analytics/compliance${moduleQ}`, { credentials: 'include' }),
      ]);
      if (mbRes.ok && cRes.ok) {
        const mb = await mbRes.json();
        const c = await cRes.json();
        setAnalytics({ modules: mb.modules ?? [], trends: c.trends ?? {}, compliance: c.compliance_score });
      } else {
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const overdueTasks = tasks.filter(t => 
    t.status !== 'complete' && new Date(t.due_at) < new Date()
  );
  
  const dueTodayTasks = tasks.filter(t => 
    t.status !== 'complete' && isSameDay(new Date(t.due_at), new Date())
  );

  const dueThisWeekTasks = tasks.filter(t => {
    const dueDate = new Date(t.due_at);
    const weekStart = startOfWeek(new Date());
    const weekEnd = addDays(weekStart, 7);
    return t.status !== 'complete' && isAfter(dueDate, new Date()) && isBefore(dueDate, weekEnd);
  });

  const completedTasks = tasks.filter(t => t.status === 'complete');

  const getTasksByDate = (date: Date) => {
    return tasks.filter(t => isSameDay(new Date(t.due_at), date));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const TaskRow = ({ task }: { task: Task }) => {
    const isOverdue = task.status !== 'complete' && new Date(task.due_at) < new Date();
    const dueDate = new Date(task.due_at);

    return (
      <div 
        onClick={() => navigate(`/task/${task.id}`)}
        className={`p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${
          isOverdue ? 'border-destructive bg-destructive/5' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(task.status)}
              <h3 className="font-semibold">{task.title}</h3>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-1">
              {task.description || 'No description'}
            </p>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{task.module.replace('_', ' ')}</Badge>
              <Badge variant={task.priority === 'high' ? 'destructive' : 'default'}>
                {task.priority}
              </Badge>
              {task.assignedUser && (
                <Badge variant="secondary">
                  {task.assignedUser.name}
                </Badge>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className={`text-sm font-medium ${isOverdue ? 'text-destructive' : ''}`}>
              {format(dueDate, 'MMM d, yyyy')}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(dueDate, 'h:mm a')}
            </div>
            {isOverdue && (
              <div className="text-xs text-destructive font-medium mt-1">
                OVERDUE
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const CalendarView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = [];
    
    for (let day = monthStart; day <= monthEnd; day = addDays(day, 1)) {
      days.push(day);
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-medium text-sm p-2">
            {day}
          </div>
        ))}
        {days.map(day => {
          const dayTasks = getTasksByDate(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={day.toString()}
              className={`min-h-[100px] p-2 border rounded-lg ${
                isToday ? 'bg-primary/10 border-primary' : ''
              }`}
            >
              <div className="text-sm font-medium mb-1">
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/task/${task.id}`)}
                    className={`text-xs p-1 rounded cursor-pointer hover:shadow ${
                      task.status === 'complete' 
                        ? 'bg-success/20 text-success' 
                        : task.priority === 'high'
                        ? 'bg-destructive/20 text-destructive'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="truncate">{task.title}</div>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loadError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <p className="font-medium">Failed to load report data</p>
              <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
            </div>
            <Button variant="outline" onClick={() => { setLoading(true); fetchTasks(); }}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-8 w-8" />
            Task Schedule & Reports
          </h1>
          <p className="text-muted-foreground">View and manage all scheduled tasks across the practice</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{overdueTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dueTodayTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Need completion today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dueThisWeekTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-success flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{completedTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Phase 6: expected-vs-actual per module + compliance trends */}
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Expected vs Actual (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Compliance: </span>
                <span className="font-semibold">{analytics.compliance != null ? `${analytics.compliance}%` : '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Trend 7d / 30d / 90d: </span>
                <span className="font-semibold">
                  {['7d', '30d', '90d'].map((k) => (analytics.trends[k] != null ? `${analytics.trends[k]}%` : '—')).join(' / ')}
                </span>
              </div>
            </div>
            {analytics.modules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scheduled occurrences in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-4">Module</th>
                      <th className="py-2 pr-4 text-right">Expected</th>
                      <th className="py-2 pr-4 text-right">On time</th>
                      <th className="py-2 pr-4 text-right">Late</th>
                      <th className="py-2 pr-4 text-right">Overdue</th>
                      <th className="py-2 pr-4 text-right">Missed</th>
                      <th className="py-2 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.modules.map((m) => (
                      <tr key={m.module} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium capitalize">{m.module}</td>
                        <td className="py-2 pr-4 text-right">{m.expected}</td>
                        <td className="py-2 pr-4 text-right text-success">{m.completed_on_time}</td>
                        <td className="py-2 pr-4 text-right text-warning">{m.completed_late}</td>
                        <td className="py-2 pr-4 text-right text-destructive">{m.overdue_open}</td>
                        <td className="py-2 pr-4 text-right text-destructive">{m.missed}</td>
                        <td className="py-2 text-right font-semibold">{m.score != null ? `${m.score}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & View Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap items-center">
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="month_end">Month-End</SelectItem>
                <SelectItem value="claims">Claims</SelectItem>
                <SelectItem value="infection_control">IC Audit</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="incidents">Incidents</SelectItem>
                <SelectItem value="fire_safety">Fire & H&S</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="complaints">Complaints</SelectItem>
                <SelectItem value="medical_requests">Medicals</SelectItem>
                <SelectItem value="policies">Policies</SelectItem>
                <SelectItem value="fridge_temps">Fridge Temps</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 ml-auto">
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('timeline')}
              >
                <List className="h-4 w-4 mr-2" />
                Timeline
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Calendar
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading schedule...</p>
        </div>
      ) : (
        <Tabs defaultValue="overdue" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overdue">
              Overdue ({overdueTasks.length})
            </TabsTrigger>
            <TabsTrigger value="today">
              Due Today ({dueTodayTasks.length})
            </TabsTrigger>
            <TabsTrigger value="week">
              This Week ({dueThisWeekTasks.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Tasks ({tasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overdue" className="space-y-4">
            {viewMode === 'calendar' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Calendar View</CardTitle>
                </CardHeader>
                <CardContent>
                  <CalendarView />
                </CardContent>
              </Card>
            ) : overdueTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                  <p className="text-lg font-medium">No overdue tasks!</p>
                  <p className="text-muted-foreground">Great job staying on schedule</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {overdueTasks.map(task => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="today" className="space-y-4">
            {viewMode === 'calendar' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Calendar View</CardTitle>
                </CardHeader>
                <CardContent>
                  <CalendarView />
                </CardContent>
              </Card>
            ) : dueTodayTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">No tasks due today</p>
                  <p className="text-muted-foreground">Check the week view for upcoming tasks</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {dueTodayTasks.map(task => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="week" className="space-y-4">
            {viewMode === 'calendar' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Calendar View</CardTitle>
                </CardHeader>
                <CardContent>
                  <CalendarView />
                </CardContent>
              </Card>
            ) : dueThisWeekTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">No tasks due this week</p>
                  <p className="text-muted-foreground">Looking good for the week ahead</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {dueThisWeekTasks.map(task => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {viewMode === 'calendar' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Calendar View - {format(currentDate, 'MMMM yyyy')}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDate(addDays(currentDate, -30))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDate(new Date())}
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDate(addDays(currentDate, 30))}
                      >
                        Next
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CalendarView />
                </CardContent>
              </Card>
            ) : tasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">No tasks found</p>
                  <p className="text-muted-foreground">Adjust filters or create new tasks</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
