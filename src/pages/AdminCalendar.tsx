import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfMonth, endOfMonth, addDays, isSameDay, parseISO } from 'date-fns';
import { CalendarDays, BarChart3, Settings, ChevronLeft, ChevronRight, Edit3, Eye, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CalendarTask {
  id: string;
  title: string;
  dueAt: string;
  status: string;
  assignedToUserId: string;
  assigneeName?: string;
  module?: string;
}

export default function AdminCalendar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');

  const isAdmin = user?.isPracticeManager || user?.role === 'administrator';

  useEffect(() => {
    fetchTasks();
  }, [user, viewDate]);

  const fetchTasks = async () => {
    if (!user?.practiceId) return;

    try {
      const res = await fetch(`/api/practices/${user.practiceId}/tasks`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();

      const usersRes = await fetch(`/api/practices/${user.practiceId}/users`, { credentials: 'include' });
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const userMap = new Map((usersData || []).map((u: any) => [u.id, u.name]));

      const startDate = startOfMonth(viewDate);
      const endDate = endOfMonth(viewDate);

      const filtered = (data || [])
        .filter((task: any) => {
          const dueDate = new Date(task.dueAt);
          return dueDate >= startDate && dueDate <= endDate;
        })
        .map((task: any) => ({
          id: task.id,
          title: task.title,
          dueAt: task.dueAt,
          status: task.status,
          assignedToUserId: task.assignedToUserId,
          assigneeName: userMap.get(task.assignedToUserId) || 'Unassigned',
          module: task.module,
        }));

      setTasks(filtered);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      isSameDay(parseISO(task.dueAt), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'complete': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleReschedule = async () => {
    if (!selectedTask || !newDueDate || !user?.practiceId) return;

    try {
      const res = await fetch(`/api/practices/${user.practiceId}/tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: selectedTask.id, dueAt: newDueDate }),
      });

      if (!res.ok) throw new Error('Failed to reschedule');

      toast.success('Task rescheduled successfully');
      setShowRescheduleDialog(false);
      setSelectedTask(null);
      setNewDueDate('');
      fetchTasks();
    } catch (error) {
      console.error('Error rescheduling task:', error);
      toast.error('Failed to reschedule task');
    }
  };

  const tasksForSelectedDate = getTasksForDate(selectedDate);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You need administrator or practice manager privileges to access this page.
              </p>
              <Button onClick={() => navigate('/')} className="mt-4">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Administrator Calendar</h1>
            <p className="text-muted-foreground">Manage and schedule audit processes</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/admin/reports')} variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </Button>
            <Button onClick={() => navigate('/')} variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button onClick={signOut} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Task Calendar
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewDate(addDays(startOfMonth(viewDate), -1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium">
                    {format(viewDate, 'MMMM yyyy')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewDate(addDays(endOfMonth(viewDate), 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                month={viewDate}
                onMonthChange={setViewDate}
                className="w-full"
                components={{
                  Day: ({ date, ...props }) => {
                    const dayTasks = getTasksForDate(date);
                    return (
                      <div className="relative">
                        <button {...props}>
                          {format(date, 'd')}
                        </button>
                        {dayTasks.length > 0 && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                            {dayTasks.slice(0, 3).map((task, index) => (
                              <div
                                key={index}
                                className={`w-1.5 h-1.5 rounded-full ${getStatusColor(task.status)}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Tasks for {format(selectedDate, 'MMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : tasksForSelectedDate.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No tasks scheduled for this date
                </div>
              ) : (
                <div className="space-y-3">
                  {tasksForSelectedDate.map((task) => (
                    <div key={task.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{task.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Assigned to: {task.assigneeName}
                          </p>
                          <Badge 
                            variant="outline" 
                            className={`mt-1 ${getStatusColor(task.status)} text-white border-none`}
                          >
                            {task.status}
                          </Badge>
                        </div>
                        <div className="flex gap-1 ml-2">
                          {task.status === 'completed' || task.status === 'complete' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/task/${task.id}`)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedTask(task);
                                  setNewDueDate(task.dueAt.split('T')[0]);
                                  setShowRescheduleDialog(true);
                                }}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/task/${task.id}`)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task</Label>
              <p className="text-sm text-muted-foreground">
                {selectedTask?.title}
              </p>
            </div>
            <div>
              <Label htmlFor="new-due-date">New Due Date</Label>
              <Input
                id="new-due-date"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleReschedule}>
                Reschedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}