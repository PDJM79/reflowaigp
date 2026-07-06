import { useState, useEffect } from 'react';
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

  const practiceId = selectedPracticeId || user?.practiceId || null;

  useEffect(() => {
    if (!user || !practiceId) {
      setLoading(false);
      return;
    }
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, practiceId, search, entityType, action, dateRange?.start, dateRange?.end, page, pageSize]);

  async function fetchLogs() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (entityType !== 'all') qs.set('entityType', entityType);
      if (action !== 'all') qs.set('action', action);
      if (search) qs.set('search', search);
      if (dateRange) {
        qs.set('startDate', dateRange.start.toISOString());
        qs.set('endDate', dateRange.end.toISOString());
      }
      const res = await fetch(`/api/practices/${practiceId}/audit-logs?${qs.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch audit logs (${res.status})`);
      const { rows, total } = await res.json() as { rows: AuditLog[]; total: number };

      setLogs(rows ?? []);
      setTotalCount(total ?? 0);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }

  return { logs, totalCount, loading, error };
}
