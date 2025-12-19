import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { format, startOfMonth, endOfMonth, addDays, isSameDay, parseISO } from 'date-fns';
import { CalendarDays, BarChart3, Settings, ChevronLeft, ChevronRight, Edit3, Eye, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ProcessInstance {
  id: string;
  template_id: string;
  period_start: string;
  period_end: string;
  due_at: string;
  status: string;
  assignee_id: string;
  assignee_name?: string;
  process_name?: string;
}

export default function AdminCalendar() {
  const { user, signOut } = useAuth();
  const { hasAnyCapability, loading: capabilitiesLoading } = useCapabilities();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [processes, setProcesses] = useState<ProcessInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProcess, setSelectedProcess] = useState<ProcessInstance | null>(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');

  // Check admin access via capabilities
  const isAdmin = hasAnyCapability('assign_roles', 'manage_users', 'configure_practice');

  useEffect(() => {
    fetchProcesses();
  }, [user, viewDate]);

  const fetchProcesses = async () => {
    if (!user) return;

    try {
      const startDate = startOfMonth(viewDate);
      const endDate = endOfMonth(viewDate);

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) return;

      const { data: processData, error } = await supabase
        .from('process_instances')
        .select(`
          *,
          process_templates!inner(name),
          users!assignee_id(name)
        `)
        .eq('practice_id', userData.practice_id)
        .gte('due_at', startDate.toISOString())
        .lte('due_at', endDate.toISOString())
        .order('due_at');

      if (error) throw error;

      const formattedProcesses = processData?.map(process => ({
        id: process.id,
        template_id: process.template_id,
        period_start: process.period_start,
        period_end: process.period_end,
        due_at: process.due_at,
        status: process.status,
        assignee_id: process.assignee_id,
        assignee_name: process.users?.name || 'Unassigned',
        process_name: process.process_templates.name
      })) || [];

      setProcesses(formattedProcesses);
    } catch (error) {
      console.error('Error fetching processes:', error);
      toast.error('Failed to load processes');
    } finally {
      setLoading(false);
    }
  };

  const getProcessesForDate = (date: Date) => {
    return processes.filter(process => 
      isSameDay(parseISO(process.due_at), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleReschedule = async () => {
    if (!selectedProcess || !newDueDate) return;

    try {
      const { error } = await supabase
        .from('process_instances')
        .update({ due_at: newDueDate })
        .eq('id', selectedProcess.id);

      if (error) throw error;

      toast.success('Process rescheduled successfully');
      setShowRescheduleDialog(false);
      setSelectedProcess(null);
      setNewDueDate('');
      fetchProcesses();
    } catch (error) {
      console.error('Error rescheduling process:', error);
      toast.error('Failed to reschedule process');
    }
  };

  const processesForSelectedDate = getProcessesForDate(selectedDate);

  if (capabilitiesLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

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
        {/* Header */}
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
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Process Calendar
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
                    const dayProcesses = getProcessesForDate(date);
                    return (
                      <div className="relative">
                        <button {...props}>
                          {format(date, 'd')}
                        </button>
                        {dayProcesses.length > 0 && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                            {dayProcesses.slice(0, 3).map((process, index) => (
                              <div
                                key={index}
                                className={`w-1.5 h-1.5 rounded-full ${getStatusColor(process.status)}`}
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

          {/* Selected Date Processes */}
          <Card>
            <CardHeader>
              <CardTitle>
                Processes for {format(selectedDate, 'MMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : processesForSelectedDate.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No processes scheduled for this date
                </div>
              ) : (
                <div className="space-y-3">
                  {processesForSelectedDate.map((process) => (
                    <div key={process.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{process.process_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Assigned to: {process.assignee_name}
                          </p>
                          <Badge 
                            variant="outline" 
                            className={`mt-1 ${getStatusColor(process.status)} text-white border-none`}
                          >
                            {process.status}
                          </Badge>
                        </div>
                        <div className="flex gap-1 ml-2">
                          {process.status === 'completed' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/task/${process.id}`)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedProcess(process);
                                  setNewDueDate(process.due_at.split('T')[0]);
                                  setShowRescheduleDialog(true);
                                }}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/task/${process.id}`)}
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

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Process</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Process</Label>
              <p className="text-sm text-muted-foreground">
                {selectedProcess?.process_name}
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