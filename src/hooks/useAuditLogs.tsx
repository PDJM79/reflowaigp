import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePracticeSelection } from './usePracticeSelection';

export interface AuditLog {
  id: string;
  practice_id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined
  user_name: string | null;
}

export interface UseAuditLogsParams {
  search?: string;
  entityType?: string;
  action?: string;
  dateRange?: { start: Date; end: Date };
  page?: number;
  pageSize?: number;
}

export function useAuditLogs(params: UseAuditLogsParams = {}) {
  const { user } = useAuth();
  const { selectedPracticeId } = usePracticeSelection();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    search = '',
    entityType = 'all',
    action = 'all',
    dateRange,
    page = 1,
    pageSize = 25,
  } = params;

  useEffect(() => {
    if (!user || !selectedPracticeId) {
      setLoading(false);
      return;
    }
    fetchLogs();
  }, [user, selectedPracticeId, search, entityType, action, dateRange?.start, dateRange?.end, page, pageSize]);

  async function fetchLogs() {
    setLoading(true);
    setError(null);
    try {
      let query = (supabase as any)
        .from('audit_logs')
        .select('*, users!audit_logs_user_id_fkey(name)', { count: 'exact' })
        .eq('practice_id', selectedPracticeId)
        .order('created_at', { ascending: false });

      if (entityType !== 'all') query = query.eq('entity_type', entityType);
      if (action !== 'all') query = query.eq('action', action);
      if (search) {
        query = query.or(
          `entity_id.ilike.%${search}%,entity_type.ilike.%${search}%`,
        );
      }
      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error: fetchError, count } = await query;
      if (fetchError) throw fetchError;

      const mapped: AuditLog[] = (data ?? []).map((row: any) => ({
        ...row,
        ip_address: row.ip_address ?? null,
        user_agent: row.user_agent ?? null,
        user_name: row.users?.name ?? null,
      }));

      setLogs(mapped);
      setTotalCount(count ?? 0);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }

  return { logs, totalCount, loading, error };
}
