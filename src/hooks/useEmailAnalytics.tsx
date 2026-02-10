import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

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
  const [dailyStats] = useState<DailyStats[]>([]);
  const [emailTypeStats] = useState<EmailTypeStats[]>([]);
  const [statusDistribution] = useState<StatusDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [user, days]);

  return {
    dailyStats,
    emailTypeStats,
    statusDistribution,
    loading,
  };
}