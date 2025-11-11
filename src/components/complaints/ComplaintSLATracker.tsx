import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const ComplaintSLATracker = () => {
  const { user } = useAuth();

  const { data: analytics } = useQuery({
    queryKey: ['complaints-analytics', user?.id],
    queryFn: async () => {
      const { data: userData } = await (supabase as any)
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData?.practice_id) return null;

      const { data } = await (supabase as any)
        .from('complaints_analytics')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .single();

      return data;
    },
    enabled: !!user?.id,
  });

  if (!analytics) {
    return null;
  }

  const slaCompliance = analytics.within_sla_count 
    ? Math.round((analytics.within_sla_count / analytics.completed_count) * 100)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{slaCompliance}%</div>
          <p className="text-xs text-muted-foreground">
            {analytics.within_sla_count} of {analytics.completed_count} within 30 days
          </p>
        </CardContent>
      </Card>

      <Card className={analytics.ack_overdue_count > 0 ? 'border-warning' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" />
            Ack. Overdue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{analytics.ack_overdue_count}</div>
          <p className="text-xs text-muted-foreground">Needs 48hr acknowledgment</p>
        </CardContent>
      </Card>

      <Card className={analytics.response_overdue_count > 0 ? 'border-destructive' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Response Overdue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{analytics.response_overdue_count}</div>
          <p className="text-xs text-muted-foreground">Past 30-day deadline</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Avg. Resolution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{analytics.avg_completion_days || 0}</div>
          <p className="text-xs text-muted-foreground">Working days</p>
        </CardContent>
      </Card>
    </div>
  );
};
