import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface EmailLog {
  id: string;
  practiceId: string;
  resendEmailId: string | null;
  recipientEmail: string;
  recipientName: string | null;
  emailType: string;
  subject: string;
  status: string;
  sentAt: string;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  bouncedAt: string | null;
  complainedAt: string | null;
  bounceType: string | null;
  bounceReason: string | null;
  errorMessage: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
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
  const [logs] = useState<EmailLog[]>([]);
  const [stats] = useState<EmailStats>({
    totalSent: 0,
    deliveryRate: 0,
    bounceRate: 0,
    openRate: 0,
  });
  const [totalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    setLoading(false);
  }, [user, params.search, params.dateRange, params.status, params.emailType, params.page, params.pageSize]);

  return {
    logs,
    stats,
    totalCount,
    loading,
    error,
  };
}