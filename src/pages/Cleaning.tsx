import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplet, Calendar, ListChecks, Loader2, RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { triggerHaptic } from '@/lib/haptics';
import { CleaningDashboard } from '@/components/cleaning/CleaningDashboard';

export default function Cleaning() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { scrollableRef, isPulling, pullProgress, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await fetchCleaningTasks();
      triggerHaptic('success');
    },
    enabled: isMobile,
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchCleaningTasks();
  }, [user, navigate]);

  const fetchCleaningTasks = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .eq('module', 'cleaning')
        .order('due_at', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching cleaning tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const openTasks = tasks.filter(t => t.status === 'open');
  const completedTasks = tasks.filter(t => t.status === 'complete');

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Droplet className="h-6 w-6 sm:h-8 sm:w-8" />
            {t('cleaning.title')}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Daily cleaning schedules and room checks</p>
        </div>
        <Button 
          onClick={() => navigate('/tasks?module=cleaning')}
          size={isMobile ? 'lg' : 'default'}
          className="w-full sm:w-auto min-h-[44px]"
        >
          <ListChecks className="h-4 w-4 mr-2" />
          {isMobile ? 'View Tasks' : 'View All Cleaning Tasks'}
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-3 sm:gap-4">
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Today's Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{openTasks.length}</div>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{completedTasks.length}</div>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading cleaning data...</div>
      ) : (
        <>
          <CleaningDashboard />
          
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Droplet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No cleaning tasks yet</p>
                <p className="text-sm text-muted-foreground">
                  Use the dashboard above to set up zones, tasks, and rooms
                </p>
              </CardContent>
            </Card>
          ) : (
        <div className="grid gap-3 sm:gap-4">
          {tasks.slice(0, 10).map((task) => (
            <Card 
              key={task.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer active:scale-[0.98] touch-manipulation"
              onClick={() => navigate(`/task/${task.id}`)}
            >
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg">{task.title}</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs sm:text-sm whitespace-nowrap">{new Date(task.due_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
          )}
        </>
      )}
    </div>
  );
}
