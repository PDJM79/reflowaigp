import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';

type Task = {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  status: string;
  module: string;
  assignedToUserId: string;
  assignedToRole: string;
  assigneeName?: string;
};

export default function Schedule() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const isManager = user?.isPracticeManager || user?.role === 'practice_manager' || user?.role === 'administrator' || user?.role === 'group_manager';

  useEffect(() => {
    if (!user?.practiceId) return;

    const fetchTasks = async () => {
      try {
        const [tasksRes, usersRes] = await Promise.all([
          fetch(`/api/practices/${user.practiceId}/tasks`, { credentials: 'include' }),
          fetch(`/api/practices/${user.practiceId}/users`, { credentials: 'include' }),
        ]);

        const tasksData = tasksRes.ok ? await tasksRes.json() : [];
        const usersData = usersRes.ok ? await usersRes.json() : [];
        const userMap = new Map((usersData || []).map((u: any) => [u.id, u.name]));

        const startDate = new Date();
        const endDate = addMonths(startDate, 12);

        const filtered = (tasksData || [])
          .filter((t: any) => {
            const dueDate = new Date(t.dueAt);
            return dueDate >= startDate && dueDate <= endDate;
          })
          .sort((a: any, b: any) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
          .map((task: any) => ({
            ...task,
            assigneeName: task.assignedToUserId ? userMap.get(task.assignedToUserId) : task.assignedToRole,
          }));

        setTasks(filtered);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user]);

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => isSameDay(new Date(task.dueAt), date));
  };

  const getTasksForMonth = (month: Date) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return tasks.filter(task => {
      const taskDate = new Date(task.dueAt);
      return taskDate >= start && taskDate <= end;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
      case 'submitted':
        return 'bg-green-500';
      case 'overdue':
        return 'bg-red-500';
      case 'in_progress':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
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
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center font-semibold text-sm text-muted-foreground">
              {day}
            </div>
          ))}

          {days.map(day => {
            const dayTasks = getTasksForDate(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <Card
                key={day.toString()}
                className={cn(
                  "min-h-[120px] p-2",
                  !isSameMonth(day, currentMonth) && "opacity-50",
                  isToday && "border-primary border-2"
                )}
              >
                <div className="flex flex-col h-full">
                  <div className={cn(
                    "text-sm font-medium mb-2",
                    isToday && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1 flex-1 overflow-y-auto">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className="text-xs p-1 rounded bg-accent hover:bg-accent/80 cursor-pointer"
                        title={`${task.title} - ${task.assigneeName || task.assignedToRole}`}
                      >
                        <div className="flex items-center gap-1">
                          <div className={cn("w-2 h-2 rounded-full", getStatusColor(task.status))} />
                          <span className="truncate">{task.title}</span>
                        </div>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
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
      const monthKey = format(month, 'MMMM yyyy');
      monthlyTasks.set(monthKey, getTasksForMonth(month));
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
                  {monthTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn("w-3 h-3 rounded-full", getStatusColor(task.status))} />
                        <div className="flex-1">
                          <h4 className="font-medium">{task.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(task.dueAt), 'PPP')}
                            </span>
                            <Badge variant="outline" className="text-xs">{task.module}</Badge>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {task.assigneeName || task.assignedToRole}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={
                        task.status === 'closed' || task.status === 'submitted' ? 'default' :
                        task.status === 'overdue' ? 'destructive' : 'secondary'
                      }>
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading schedule...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Schedule View</p>
            <p className="text-muted-foreground">Available to Practice Managers only</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BackButton />
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Task Schedule
          </h1>
        </div>
        <p className="text-muted-foreground">12-month overview of all scheduled tasks</p>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list')}>
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          {renderCalendarView()}
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          {renderListView()}
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold">{tasks.length}</div>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {tasks.filter(t => t.status === 'closed' || t.status === 'submitted').length}
              </div>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length}
              </div>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {tasks.filter(t => t.status === 'overdue').length}
              </div>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}