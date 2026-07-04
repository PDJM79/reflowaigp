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

  // Map an API fridge_readings row into the TempLogWithFridge shape the render uses.
  const mapReading = useCallback((r: any): TempLogWithFridge => {
    const fridge = fridges.find((f) => f.id === r.fridgeId);
    return {
      id: r.id,
      log_date: String(r.readingDate).slice(0, 10),
      log_time: r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      breach_flag: !!r.isOutOfRange,
      reading: r.temperature,
      remedial_action: r.actionTaken ?? null,
      outcome: null,
      fridges: fridge ? { name: fridge.name, min_temp: fridge.min_temp, max_temp: fridge.max_temp } : undefined,
    } as unknown as TempLogWithFridge;
  }, [fridges]);

  // fridge_readings has no date-filter param, so fetch once and filter client-side.
  const fetchAllReadings = useCallback(async (): Promise<any[]> => {
    const res = await fetch(`/api/practices/${practiceId}/fridge-readings`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load logs');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, [practiceId]);

  const fetchLogsForDate = useCallback(async (date: Date) => {
    setIsLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const readings = await fetchAllReadings();
      setLogs(readings.filter((r) => String(r.readingDate).slice(0, 10) === dateStr).map(mapReading));
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllReadings, mapReading]);

  const fetchWeeklyStats = useCallback(async (date: Date) => {
    try {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      const readings = await fetchAllReadings();
      const inWeek = readings
        .map((r) => ({ date: String(r.readingDate).slice(0, 10), breach: !!r.isOutOfRange }))
        .filter((r) => r.date >= format(weekStart, 'yyyy-MM-dd') && r.date <= format(weekEnd, 'yyyy-MM-dd'));

      const stats: DailyComplianceStats[] = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayLogs = inWeek.filter(l => l.date === dayStr);
        const breaches = dayLogs.filter(l => l.breach).length;
        const total = dayLogs.length;
        const compliant = total - breaches;
        const complianceRate = total > 0 ? (compliant / total) * 100 : 0;
        return { date: dayStr, total, compliant, breaches, complianceRate };
      });

      setWeeklyStats(stats);
      onStatsChange(stats);
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
    }
  }, [fetchAllReadings, onStatsChange]);

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
