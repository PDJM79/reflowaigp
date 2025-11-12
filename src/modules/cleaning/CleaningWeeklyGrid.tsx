import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, addDays, subWeeks, addWeeks } from "date-fns";

export function CleaningWeeklyGrid() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initials, setInitials] = useState<Record<string, string>>({});

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchData();
  }, [currentWeek]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('cleaning_tasks')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .eq('is_active', true)
        .order('task_name');

      if (tasksError) throw tasksError;

      // Fetch logs for this week
      const weekEnd = addDays(weekStart, 6);
      const { data: logsData, error: logsError } = await supabase
        .from('cleaning_logs')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .gte('log_date', weekStart.toISOString())
        .lte('log_date', weekEnd.toISOString());

      if (logsError) throw logsError;

      setTasks(tasksData || []);
      setLogs(logsData || []);

      // Initialize initials from existing logs
      const initialsMap: Record<string, string> = {};
      logsData?.forEach(log => {
        const key = `${log.task_id}-${format(new Date(log.log_date), 'yyyy-MM-dd')}`;
        initialsMap[key] = log.initials || '';
      });
      setInitials(initialsMap);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load cleaning grid');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialsChange = async (taskId: string, date: Date, value: string) => {
    const key = `${taskId}-${format(date, 'yyyy-MM-dd')}`;
    setInitials(prev => ({ ...prev, [key]: value }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id, id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      // Check if log exists
      const existingLog = logs.find(
        log => log.task_id === taskId && 
        format(new Date(log.log_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );

      if (existingLog) {
        // Update existing log
        await supabase
          .from('cleaning_logs')
          .update({ initials: value })
          .eq('id', existingLog.id);
      } else {
        // Create new log
        const retainedUntil = new Date(date);
        retainedUntil.setFullYear(retainedUntil.getFullYear() + 5);

        await supabase
          .from('cleaning_logs')
          .insert([{
            practice_id: userData.practice_id,
            room_id: taskId, // Using taskId as room_id for now - needs proper room management
            task_id: taskId,
            log_date: format(date, 'yyyy-MM-dd'),
            initials: value,
            retained_until: retainedUntil.toISOString()
          }]);
      }

      fetchData(); // Refresh to get updated logs
    } catch (error: any) {
      console.error('Error saving initials:', error);
      toast.error('Failed to save initials');
    }
  };

  if (loading) return <p>Loading weekly grid...</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Annex-B Weekly Cleaning Grid</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-4">
                Week {format(weekStart, 'dd MMM')} - {format(addDays(weekStart, 6), 'dd MMM yyyy')}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Task</TableHead>
                  <TableHead className="min-w-[80px]">Frequency</TableHead>
                  {weekDays.map((day) => (
                    <TableHead key={day.toISOString()} className="text-center min-w-[100px]">
                      <div className="text-xs">{format(day, 'EEE')}</div>
                      <div className="font-bold">{format(day, 'dd')}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.task_name}</TableCell>
                    <TableCell className="text-xs capitalize">{task.frequency}</TableCell>
                    {weekDays.map((day) => {
                      const key = `${task.id}-${format(day, 'yyyy-MM-dd')}`;
                      return (
                        <TableCell key={day.toISOString()} className="p-1">
                          <Input
                            value={initials[key] || ''}
                            onChange={(e) => handleInitialsChange(task.id, day, e.target.value)}
                            className="h-8 text-center text-sm"
                            placeholder="..."
                            maxLength={4}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            📋 NHS Cleanliness 2025 Model • All records retained for 5 years
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
