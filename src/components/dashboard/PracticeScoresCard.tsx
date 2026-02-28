import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Loader2 } from 'lucide-react';

function scoreColor(score: number) {
  if (score >= 85) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function PracticeScoresCard() {
  const { user } = useAuth();
  const practiceId = user?.practiceId;

  const { data: scores, isLoading } = useQuery({
    queryKey: ['practice-scores-card', practiceId],
    queryFn: async () => {
      if (!practiceId) return null;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('status, due_at, completed_at, is_auditable')
        .eq('practice_id', practiceId)
        .gte('due_at', thirtyDaysAgo.toISOString())
        .lte('due_at', now.toISOString());

      if (error || !tasks || tasks.length === 0) return null;

      const total = tasks.length;
      const closedOnTime = tasks.filter(
        t => t.status === 'closed' && t.completed_at && new Date(t.completed_at) <= new Date(t.due_at)
      ).length;
      const closedLate = tasks.filter(
        t => t.status === 'closed' && t.completed_at && new Date(t.completed_at) > new Date(t.due_at)
      ).length;
      const complianceScore = Math.round((closedOnTime + closedLate * 0.7) / total * 100);

      const auditable = tasks.filter(t => t.is_auditable);
      const auditablePassed = auditable.filter(t => t.status === 'closed').length;
      const fitScore = auditable.length === 0 ? 100 : Math.round(auditablePassed / auditable.length * 100);

      return { complianceScore, fitScore, totalDue: total, auditableTotal: auditable.length };
    },
    enabled: !!practiceId,
  });

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Practice Scores
          </CardTitle>
          <CardDescription>Compliance & Fit for Audit metrics (last 30 days)</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !scores ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            No audit scores available yet.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Compliance</span>
                <span className={`text-2xl font-bold ${scoreColor(scores.complianceScore)}`}>
                  {scores.complianceScore}%
                </span>
              </div>
              <Progress value={scores.complianceScore} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Task completion rate — {scores.totalDue} tasks due this period
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fit for Audit</span>
                <span className={`text-2xl font-bold ${scoreColor(scores.fitScore)}`}>
                  {scores.fitScore}%
                </span>
              </div>
              <Progress value={scores.fitScore} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Auditable tasks closed — {scores.auditableTotal} auditable tasks this period
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
