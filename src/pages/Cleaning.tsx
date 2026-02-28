import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplet, Loader2, RefreshCw, CheckCircle2, Circle, Settings } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { triggerHaptic } from '@/lib/haptics';
import { ZoneTypeIcon } from '@/components/cleaning/ZoneTypeIcon';
import { toast } from 'sonner';

interface CleaningZone {
  id: string;
  zone_name: string;
  zone_type: string | null;
}

interface CleaningTask {
  id: string;
  task_name: string;
  description: string | null;
  frequency: string;
  zone_id: string | null;
}

interface CleaningLog {
  task_id: string | null;
  completed_at: string | null;
  initials: string | null;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  twice_daily: '2× Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  periodic: 'Periodic',
};

export default function Cleaning() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [zones, setZones] = useState<CleaningZone[]>([]);
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [todayLogs, setTodayLogs] = useState<CleaningLog[]>([]);
  const [loading, setLoading] = useState(true);

  const { scrollableRef, isPulling, pullProgress, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await fetchCleaningData();
      triggerHaptic('success');
    },
    enabled: isMobile,
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchCleaningData();
  }, [user, navigate]);

  const fetchCleaningData = async () => {
    if (!user?.practiceId) {
      setLoading(false);
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];

      const [zonesResult, tasksResult, logsResult] = await Promise.all([
        supabase
          .from('cleaning_zones')
          .select('id, zone_name, zone_type')
          .eq('practice_id', user.practiceId)
          .eq('is_active', true)
          .order('zone_name'),

        supabase
          .from('cleaning_tasks')
          .select('id, task_name, description, frequency, zone_id')
          .eq('practice_id', user.practiceId)
          .eq('is_active', true),

        supabase
          .from('cleaning_logs')
          .select('task_id, completed_at, initials')
          .eq('practice_id', user.practiceId)
          .eq('log_date', today),
      ]);

      if (zonesResult.error) throw zonesResult.error;
      if (tasksResult.error) throw tasksResult.error;

      setZones(zonesResult.data || []);
      setTasks(tasksResult.data || []);
      setTodayLogs(logsResult.data || []);
    } catch (error) {
      console.error('Error fetching cleaning data:', error);
      toast.error('Failed to load cleaning data');
    } finally {
      setLoading(false);
    }
  };

  // All active tasks appear in today's schedule regardless of frequency type
  const todayTasks = tasks;
  const completedIds = new Set(todayLogs.filter(l => l.completed_at).map(l => l.task_id));

  const tasksByZone = zones
    .map(zone => ({
      zone,
      tasks: todayTasks.filter(t => t.zone_id === zone.id),
    }))
    .filter(g => g.tasks.length > 0);

  // Unassigned daily tasks (no zone)
  const unassignedTasks = todayTasks.filter(t => !t.zone_id);

  const completedToday = todayTasks.filter(t => completedIds.has(t.id)).length;

  return (
    <div ref={scrollableRef} className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
      {isMobile && (isPulling || isRefreshing) && (
        <div
          className="flex items-center justify-center py-4 transition-opacity"
          style={{ opacity: isPulling ? pullProgress : 1 }}
        >
          {isRefreshing ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <RefreshCw
              className="h-6 w-6 text-primary transition-transform"
              style={{ transform: `rotate(${pullProgress * 360}deg)` }}
            />
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Droplet className="h-6 w-6 sm:h-8 sm:w-8" />
              {t('cleaning.title')}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Today's cleaning schedule — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Button
          variant="outline"
          size={isMobile ? 'lg' : 'default'}
          className="min-h-[44px]"
          onClick={() => navigate('/cleaning/manage')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage Zones & Tasks
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-3 sm:gap-4">
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{zones.length}</div>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Due Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{todayTasks.length}</div>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl sm:text-3xl font-bold ${completedToday === todayTasks.length && todayTasks.length > 0 ? 'text-green-600' : ''}`}>
              {completedToday}/{todayTasks.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : zones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Droplet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium mb-2">No cleaning zones configured</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add zones and daily tasks to see today's cleaning schedule here.
            </p>
            <Button onClick={() => navigate('/cleaning/manage')}>
              <Settings className="h-4 w-4 mr-2" />
              Manage Zones & Tasks
            </Button>
          </CardContent>
        </Card>
      ) : todayTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="font-medium mb-2">No daily tasks configured</p>
            <p className="text-sm text-muted-foreground">
              Add cleaning tasks to zones to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Tasks grouped by zone */}
          {tasksByZone.map(({ zone, tasks: zoneTasks }) => {
            const zoneCompleted = zoneTasks.filter(t => completedIds.has(t.id)).length;
            const allDone = zoneCompleted === zoneTasks.length;

            return (
              <Card key={zone.id} className={allDone ? 'border-green-200 dark:border-green-800' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ZoneTypeIcon type={zone.zone_type || 'other'} className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">{zone.zone_name}</CardTitle>
                      {zone.zone_type && (
                        <Badge variant="outline" className="text-xs capitalize">{zone.zone_type}</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {zoneCompleted}/{zoneTasks.length} done
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y">
                    {zoneTasks.map(task => {
                      const done = completedIds.has(task.id);
                      const log = todayLogs.find(l => l.task_id === task.id && l.completed_at);
                      return (
                        <div key={task.id} className="flex items-center gap-3 py-2.5">
                          {done ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>
                              {task.task_name}
                            </p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {FREQUENCY_LABELS[task.frequency] || task.frequency}
                            </Badge>
                            {done && log?.initials && (
                              <span className="text-xs text-muted-foreground">{log.initials}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Unassigned tasks */}
          {unassignedTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-muted-foreground">Unassigned Tasks</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y">
                  {unassignedTasks.map(task => {
                    const done = completedIds.has(task.id);
                    return (
                      <div key={task.id} className="flex items-center gap-3 py-2.5">
                        {done ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <p className={`flex-1 text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>
                          {task.task_name}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {FREQUENCY_LABELS[task.frequency] || task.frequency}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
