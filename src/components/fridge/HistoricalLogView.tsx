import { useState, useEffect, useCallback } from 'react';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarIcon, AlertTriangle, CheckCircle, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TempLogWithFridge, Fridge, DailyComplianceStats } from './types';

interface HistoricalLogViewProps {
  practiceId: string;
  fridges: Fridge[];
  onSelectBreachLog: (log: TempLogWithFridge) => void;
  onStatsChange: (stats: DailyComplianceStats[]) => void;
}

export function HistoricalLogView({ practiceId, fridges, onSelectBreachLog, onStatsChange }: HistoricalLogViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [logs, setLogs] = useState<TempLogWithFridge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<DailyComplianceStats[]>([]);

  const fetchLogsForDate = useCallback(async (date: Date) => {
    setIsLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('temp_logs')
        .select('*, fridges(name, min_temp, max_temp)')
        .eq('log_date', dateStr)
        .order('log_time', { ascending: true });

      if (error) throw error;
      setLogs((data as TempLogWithFridge[]) || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchWeeklyStats = useCallback(async (date: Date) => {
    try {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

      const { data, error } = await supabase
        .from('temp_logs')
        .select('log_date, breach_flag')
        .gte('log_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('log_date', format(weekEnd, 'yyyy-MM-dd'));

      if (error) throw error;

      const stats: DailyComplianceStats[] = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayLogs = (data || []).filter(l => l.log_date === dayStr);
        const breaches = dayLogs.filter(l => l.breach_flag).length;
        const total = dayLogs.length;
        const compliant = total - breaches;
        const complianceRate = total > 0 ? (compliant / total) * 100 : 0;

        return {
          date: dayStr,
          total,
          compliant,
          breaches,
          complianceRate
        };
      });

      setWeeklyStats(stats);
      onStatsChange(stats);
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
    }
  }, [onStatsChange]);

  useEffect(() => {
    if (practiceId) {
      fetchLogsForDate(selectedDate);
      fetchWeeklyStats(selectedDate);
    }
  }, [practiceId, selectedDate, fetchLogsForDate, fetchWeeklyStats]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const breaches = logs.filter(l => l.breach_flag);
  const compliant = logs.filter(l => !l.breach_flag);

  const getOutcomeLabel = (outcome: string | null) => {
    const labels: Record<string, string> = {
      'stock_ok': 'Stock OK',
      'stock_moved': 'Stock Moved',
      'stock_discarded': 'Stock Discarded',
      'fridge_serviced': 'Fridge Serviced',
      'monitoring': 'Monitoring',
      'other': 'Other'
    };
    return outcome ? labels[outcome] || outcome : null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base sm:text-lg">Temperature Logs</CardTitle>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal min-h-[44px]",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent>
        {/* Daily Summary */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>{compliant.length} Compliant</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span>{breaches.length} Breaches</span>
          </div>
        </div>

        {/* Log List */}
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mb-2 opacity-50" />
              <p>No logs for this date</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors",
                    log.breach_flag 
                      ? "border-destructive/50 bg-destructive/5 hover:bg-destructive/10" 
                      : "hover:bg-accent"
                  )}
                  onClick={() => log.breach_flag && onSelectBreachLog(log)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{log.fridges?.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {log.log_time}
                      </Badge>
                      {log.breach_flag && (
                        <Badge variant="destructive" className="text-xs">
                          BREACH
                        </Badge>
                      )}
                    </div>
                    {log.breach_flag && log.remedial_action && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <FileWarning className="h-3 w-3" />
                        <span>Action recorded: {getOutcomeLabel(log.outcome)}</span>
                      </div>
                    )}
                    {log.breach_flag && !log.remedial_action && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-warning">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Action required - click to record</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className={cn(
                      "font-bold text-lg",
                      log.breach_flag && "text-destructive"
                    )}>
                      {log.reading}°C
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
