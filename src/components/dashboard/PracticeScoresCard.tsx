import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Loader2 } from 'lucide-react';

interface ComplianceResponse {
  compliance_score: number | null;
  fit_for_audit_score: number | null;
  basis: { compliance: string; fit_for_audit: string; high_importance: string };
  breakdown: { expected: number; high_expected: number };
}

function scoreColor(score: number) {
  if (score >= 85) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function PracticeScoresCard() {
  const { user } = useAuth();
  const practiceId = user?.practiceId;

  const { data, isLoading, isError } = useQuery<ComplianceResponse | null>({
    queryKey: ['practice-scores-card', practiceId],
    queryFn: async () => {
      if (!practiceId) return null;
      const res = await fetch(`/api/practices/${practiceId}/analytics/compliance`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to load scores (${res.status})`);
      return res.json();
    },
    enabled: !!practiceId,
  });

  const hasScore = data && data.compliance_score != null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Practice Scores
          </CardTitle>
          <CardDescription>Compliance &amp; Fit for Audit metrics (last 30 days)</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-8 text-destructive text-sm">
            Could not load practice scores.
          </div>
        ) : !hasScore ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm text-center">
            <p>No scheduled work in this period yet.</p>
            <p className="text-xs mt-1">{data?.basis?.compliance ?? 'Enable module scheduling to start tracking.'}</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Compliance</span>
                <span className={`text-2xl font-bold ${scoreColor(data!.compliance_score!)}`}>
                  {data!.compliance_score}%
                </span>
              </div>
              <Progress value={data!.compliance_score!} className="h-2" />
              <p className="text-xs text-muted-foreground">
                On-time completion (late at half credit) — {data!.breakdown.expected} occurrences due this period
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fit for Audit</span>
                <span className={`text-2xl font-bold ${data!.fit_for_audit_score != null ? scoreColor(data!.fit_for_audit_score) : 'text-muted-foreground'}`}>
                  {data!.fit_for_audit_score != null ? `${data!.fit_for_audit_score}%` : '—'}
                </span>
              </div>
              <Progress value={data!.fit_for_audit_score ?? 0} className="h-2" />
              <p className="text-xs text-muted-foreground">{data!.basis.fit_for_audit}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
