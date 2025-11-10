import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface DailyStats {
  date: string;
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  failed: number;
}

interface EmailTypeStats {
  type: string;
  total: number;
  opened: number;
  openRate: number;
}

interface StatusDistribution {
  status: string;
  count: number;
}

export function useEmailAnalytics(days: number = 30) {
  const { user } = useAuth();
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [emailTypeStats, setEmailTypeStats] = useState<EmailTypeStats[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      setLoading(true);

      try {
        // Get current user's practice_id
        const { data: userData } = await supabase
          .from('users')
          .select('practice_id')
          .eq('auth_user_id', user.id)
          .single();

        if (!userData?.practice_id) {
          setLoading(false);
          return;
        }

        const startDate = subDays(new Date(), days);

        // Fetch all logs for the period
        const { data: logs } = await supabase
          .from('email_logs')
          .select('*')
          .eq('practice_id', userData.practice_id)
          .gte('sent_at', startDate.toISOString())
          .order('sent_at', { ascending: true });

        if (!logs) {
          setLoading(false);
          return;
        }

        // Process daily stats
        const dateRange = eachDayOfInterval({
          start: startDate,
          end: new Date(),
        });

        const dailyData: DailyStats[] = dateRange.map(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayLogs = logs.filter(log => 
            format(new Date(log.sent_at), 'yyyy-MM-dd') === dateStr
          );

          return {
            date: format(date, 'MMM dd'),
            sent: dayLogs.length,
            delivered: dayLogs.filter(l => l.delivered_at).length,
            bounced: dayLogs.filter(l => l.bounced_at).length,
            opened: dayLogs.filter(l => l.opened_at).length,
            failed: dayLogs.filter(l => l.status === 'failed').length,
          };
        });

        setDailyStats(dailyData);

        // Process email type stats
        const typeMap = new Map<string, { total: number; opened: number }>();
        logs.forEach(log => {
          const current = typeMap.get(log.email_type) || { total: 0, opened: 0 };
          current.total++;
          if (log.opened_at) current.opened++;
          typeMap.set(log.email_type, current);
        });

        const typeData: EmailTypeStats[] = Array.from(typeMap.entries()).map(([type, stats]) => ({
          type: type.replace(/_/g, ' '),
          total: stats.total,
          opened: stats.opened,
          openRate: stats.total > 0 ? Math.round((stats.opened / stats.total) * 100) : 0,
        }));

        setEmailTypeStats(typeData);

        // Process status distribution
        const statusMap = new Map<string, number>();
        logs.forEach(log => {
          statusMap.set(log.status, (statusMap.get(log.status) || 0) + 1);
        });

        const statusData: StatusDistribution[] = Array.from(statusMap.entries()).map(([status, count]) => ({
          status,
          count,
        }));

        setStatusDistribution(statusData);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, days]);

  return {
    dailyStats,
    emailTypeStats,
    statusDistribution,
    loading,
  };
}
