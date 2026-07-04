import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Clock, User, AlertTriangle, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { AssignDialog } from '@/components/tasks/AssignDialog';

type Task = {
  id: string;
  title: string;
  description: string;
  due_at: string;
  status: string;
  module: string;
  assignee_id: string | null;
  assignee_name?: string;
};

const COMPLETED = new Set(['complete', 'closed', 'submitted']);

export default function Schedule() {
  const { user } = useAuth();
  const { hasAnyCapability, loading: capabilitiesLoading } = useCapabilities();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [assignTarget, setAssignTarget] = useState<{ id: string; title: string; assigneeId?: string | null } | null>(null);

  const isManager = hasAnyCapability('assign_roles', 'manage_users', 'configure_practice', 'run_reports');

  const fetchTasks = useCallback(async () => {
    if (!user?.practiceId) return;
    try {
      setLoading(true);
      setLoadError(false);
      const [tasksRes, usersRes] = await Promise.all([
        fetch(`/api/practices/${user.practiceId}/tasks`, { credentials: 'include' }),
        fetch(`/api/practices/${user.practiceId}/users`, { credentials: 'include' }),
      ]);
      if (!tasksRes.ok) throw new Error('Failed to load schedule');
      const rawTasks = await tasksRes.json();
      const rawUsers = usersRes.ok ? await usersRes.json() : [];
      const nameById = new Map<string, string>((Array.isArray(rawUsers) ? rawUsers : []).map((u: any) => [u.id, u.name]));

      const mapped: Task[] = (Array.isArray(rawTasks) ? rawTasks : [])
        .filter((t: any) => t.dueAt) // scheduled/dated tasks belong on the calendar
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          due_at: t.dueAt,
          status: t.status || 'pending',
          module: t.module || '',
          assignee_id: t.assigneeId ?? null,
          assignee_name: t.assigneeId ? (nameById.get(t.assigneeId) || 'Unknown') : null,
        }));
      setTasks(mapped);
    } catch (error) {
      console.error('Error loading schedule:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.practiceId]);

  useEffect(() => { if (user) fetchTasks(); }, [user, fetchTasks]);

  const modules = useMemo(() => Array.from(new Set(tasks.map((t) => t.module).filter(Boolean))).sort(), [tasks]);
  const assignees = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of tasks) if (t.assignee_id) seen.set(t.assignee_id, t.assignee_name || 'Unknown');
    return Array.from(seen.entries());
  }, [tasks]);

  const filteredTasks = useMemo(() => tasks.filter((t) => {
    if (moduleFilter !== 'all' && t.module !== moduleFilter) return false;
    if (assigneeFilter === 'unassigned' && t.assignee_id) return false;
    if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned' && t.assignee_id !== assigneeFilter) return false;
    return true;
  }), [tasks, moduleFilter, assigneeFilter]);

  const getTasksForDate = (date: Date) => filteredTasks.filter((t) => isSameDay(new Date(t.due_at), date));
  const getTasksForMonth = (month: Date) => {
    const start = startOfMonth(month), end = endOfMonth(month);
    return filteredTasks.filter((t) => { const d = new Date(t.due_at); return d >= start && d <= end; });
  };

  const getStatusColor = (status: string) => {
    if (COMPLETED.has(status)) return 'bg-green-500';
    if (status === 'overdue' || status === 'missed') return 'bg-red-500';
    if (status === 'in_progress') return 'bg-blue-500';
    return 'bg-gray-500';
  };

  const renderCalendarView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>Today</Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center font-semibold text-sm text-muted-foreground">{day}</div>
          ))}
          {days.map((day) => {
            const dayTasks = getTasksForDate(day);
            const isToday = isSameDay(day, new Date());
            return (
              <Card key={day.toString()} className={cn('min-h-[120px] p-2', !isSameMonth(day, currentMonth) && 'opacity-50', isToday && 'border-primary border-2')}>
                <div className="flex flex-col h-full">
                  <div className={cn('text-sm font-medium mb-2', isToday && 'text-primary')}>{format(day, 'd')}</div>
                  <div className="space-y-1 flex-1 overflow-y-auto">
                    {dayTasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => isManager && setAssignTarget({ id: task.id, title: task.title, assigneeId: task.assignee_id })}
                        className="w-full text-left text-xs p-1 rounded bg-accent hover:bg-accent/80 cursor-pointer"
                        title={`${task.title} — ${task.assignee_name || 'unassigned'}${isManager ? ' (click to reassign)' : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          <div className={cn('w-2 h-2 rounded-full', getStatusColor(task.status))} />
                          <span className="truncate">{task.title}</span>
                        </div>
                      </button>
                    ))}
                    {dayTasks.length > 3 && <div className="text-xs text-muted-foreground">+{dayTasks.length - 3} more</div>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    const monthlyTasks = new Map<string, Task[]>();
    for (let i = 0; i < 12; i++) {
      const month = addMonths(new Date(), i);
      monthlyTasks.set(format(month, 'MMMM yyyy'), getTasksForMonth(month));
    }
    return (
      <div className="space-y-6">
        {Array.from(monthlyTasks.entries()).map(([monthKey, monthTasks]) => (
          <Card key={monthKey}>
            <CardHeader>
              <CardTitle>{monthKey}</CardTitle>
              <CardDescription>{monthTasks.length} tasks scheduled</CardDescription>
            </CardHeader>
            <CardContent>
              {monthTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No tasks scheduled</p>
              ) : (
                <div className="space-y-3">
                  {monthTasks.map((task) => (
                    <div key={task.id}
                      className={cn('flex items-center justify-between p-3 border rounded-lg transition-colors', isManager && 'hover:bg-accent/50 cursor-pointer')}
                      onClick={() => isManager && setAssignTarget({ id: task.id, title: task.title, assigneeId: task.assignee_id })}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn('w-3 h-3 rounded-full', getStatusColor(task.status))} />
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(task.due_at), 'PPP')}</span>
                            {task.module && <Badge variant="outline" className="text-xs">{task.module.replace(/_/g, ' ')}</Badge>}
                            <span className="flex items-center gap-1"><User className="h-3 w-3" />{task.assignee_name || 'Unassigned'}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={COMPLETED.has(task.status) ? 'default' : task.status === 'overdue' || task.status === 'missed' ? 'destructive' : 'secondary'}>
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading || capabilitiesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Loading schedule...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Schedule View</p>
          <p className="text-muted-foreground">Available to Practice Managers only</p>
        </CardContent></Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div><p className="font-medium">Failed to load the schedule</p><p className="text-sm text-muted-foreground">Check your connection and try again.</p></div>
          <Button variant="outline" onClick={fetchTasks}><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BackButton />
          <h1 className="text-3xl font-bold flex items-center gap-2"><Calendar className="h-8 w-8" /> Task Schedule</h1>
        </div>
        <p className="text-muted-foreground">12-month overview of scheduled tasks. Managers can click a task to reassign.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="All modules" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {modules.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="All assignees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {assignees.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list')}>
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-6">{renderCalendarView()}</TabsContent>
        <TabsContent value="list" className="mt-6">{renderListView()}</TabsContent>
      </Tabs>

      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><div className="text-2xl font-bold">{filteredTasks.length}</div><p className="text-sm text-muted-foreground">Total (filtered)</p></div>
            <div><div className="text-2xl font-bold text-green-600">{filteredTasks.filter((t) => COMPLETED.has(t.status)).length}</div><p className="text-sm text-muted-foreground">Completed</p></div>
            <div><div className="text-2xl font-bold text-blue-600">{filteredTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length}</div><p className="text-sm text-muted-foreground">Open</p></div>
            <div><div className="text-2xl font-bold text-red-600">{filteredTasks.filter((t) => t.status === 'overdue' || t.status === 'missed').length}</div><p className="text-sm text-muted-foreground">Overdue / missed</p></div>
          </div>
        </CardContent>
      </Card>

      <AssignDialog isOpen={!!assignTarget} onClose={() => setAssignTarget(null)} onAssigned={fetchTasks} task={assignTarget} />
    </div>
  );
}
