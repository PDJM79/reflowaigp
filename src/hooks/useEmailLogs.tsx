import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface EmailLog {
  id: string;
  practice_id: string;
  resend_email_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  email_type: string;
  subject: string;
  status: string;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
  bounce_type: string | null;
  bounce_reason: string | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface UseEmailLogsParams {
  search?: string;
  dateRange?: { start: Date; end: Date };
  status?: string;
  emailType?: string;
  page?: number;
  pageSize?: number;
}

interface EmailStats {
  totalSent: number;
  deliveryRate: number;
  bounceRate: number;
  openRate: number;
}

export function useEmailLogs(params: UseEmailLogsParams = {}) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats>({
    totalSent: 0,
    deliveryRate: 0,
    bounceRate: 0,
    openRate: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    search = '',
    dateRange,
    status,
    emailType,
    page = 1,
    pageSize = 20,
  } = params;

  useEffect(() => {
    if (!user) return;

    const fetchLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get current user's practice_id
        const { data: userData } = await supabase
          .from('users')
          .select('practice_id')
          .eq('auth_user_id', user.id)
          .single();

        if (!userData?.practice_id) {
          setError('Practice not found');
          setLoading(false);
          return;
        }

        // Build query
        let query = supabase
          .from('email_logs')
          .select('*', { count: 'exact' })
          .eq('practice_id', userData.practice_id)
          .order('sent_at', { ascending: false });

        // Apply filters
        if (search) {
          query = query.or(`recipient_email.ilike.%${search}%,subject.ilike.%${search}%`);
        }

        if (dateRange) {
          query = query
            .gte('sent_at', dateRange.start.toISOString())
            .lte('sent_at', dateRange.end.toISOString());
        }

        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        if (emailType && emailType !== 'all') {
          query = query.eq('email_type', emailType);
        }

        // Apply pagination
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;
        query = query.range(start, end);

        const { data, count, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setLogs(data || []);
        setTotalCount(count || 0);

        // Fetch stats for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: statsData } = await supabase
          .from('email_logs')
          .select('status, delivered_at, opened_at, bounced_at')
          .eq('practice_id', userData.practice_id)
          .gte('sent_at', thirtyDaysAgo.toISOString());

        if (statsData) {
          const total = statsData.length;
          const delivered = statsData.filter(log => log.delivered_at).length;
          const bounced = statsData.filter(log => log.bounced_at).length;
          const opened = statsData.filter(log => log.opened_at).length;

          setStats({
            totalSent: total,
            deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
            bounceRate: total > 0 ? Math.round((bounced / total) * 100) : 0,
            openRate: total > 0 ? Math.round((opened / total) * 100) : 0,
          });
        }
      } catch (err) {
        console.error('Error fetching email logs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch email logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user, search, dateRange, status, emailType, page, pageSize]);

  return {
    logs,
    stats,
    totalCount,
    loading,
    error,
  };
}
