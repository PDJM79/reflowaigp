import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Shield, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { RAGBadge } from './RAGBadge';

// Phase 7: retired the unwired calculate-compliance-scores edge dependency.
// This now shows the real server-computed compliance + fit-for-audit + per-module
// scores from /api/practices/:id/analytics/compliance and /module-breakdown.

interface ModuleRow { module: string; expected: number; score: number | null }
interface ScoresData {
  compliance_score: number | null;
  fit_for_audit_score: number | null;
  basis: { compliance: string; fit_for_audit: string };
  modules: ModuleRow[];
}

const rag = (s: number): 'green' | 'amber' | 'red' => (s >= 80 ? 'green' : s >= 60 ? 'amber' : 'red');

export function AIComplianceScores() {
  const { user } = useAuth();
  const practiceId = user?.practiceId;

  const { data, isLoading, isError, refetch } = useQuery<ScoresData | null>({
    queryKey: ['compliance-scoring', practiceId],
    queryFn: async () => {
      if (!practiceId) return null;
      const [c, mb] = await Promise.all([
        fetch(`/api/practices/${practiceId}/analytics/compliance`, { credentials: 'include' }),
        fetch(`/api/practices/${practiceId}/analytics/module-breakdown`, { credentials: 'include' }),
      ]);
      if (!c.ok || !mb.ok) throw new Error('Failed to load compliance scores');
      const cj = await c.json();
      const mbj = await mb.json();
      return {
        compliance_score: cj.compliance_score,
        fit_for_audit_score: cj.fit_for_audit_score,
        basis: cj.basis,
        modules: mbj.modules ?? [],
      };
    },
    enabled: !!practiceId,
  });

  const hasScore = data && data.compliance_score != null;

  return (
    <Card data-testid="card-ai-compliance-scores">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Compliance Scoring
        </CardTitle>
        <CardDescription>Server-computed compliance &amp; fit-for-audit across modules (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">Could not load compliance scores.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Retry</Button>
          </div>
        ) : !hasScore ? (
          <div className="text-center py-8" data-testid="text-compliance-empty">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No scheduled work in this period yet.</p>
            <p className="text-xs text-muted-foreground mt-1">{data?.basis?.compliance}</p>
          </div>
        ) : (
          <div className="space-y-5" data-testid="compliance-scores-results">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold" data-testid="text-compliance-score">{data!.compliance_score}%</span>
                  <RAGBadge status={rag(data!.compliance_score!)} />
                </div>
                <p className="text-xs text-muted-foreground">Compliance</p>
                <Progress value={data!.compliance_score!} className="h-2 mt-1" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold" data-testid="text-fit-score">{data!.fit_for_audit_score != null ? `${data!.fit_for_audit_score}%` : '—'}</span>
                  {data!.fit_for_audit_score != null && <RAGBadge status={rag(data!.fit_for_audit_score)} />}
                </div>
                <p className="text-xs text-muted-foreground">Fit for Audit</p>
                <Progress value={data!.fit_for_audit_score ?? 0} className="h-2 mt-1" />
              </div>
            </div>
            {data!.modules.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">By module</h4>
                {data!.modules.map((m) => (
                  <div key={m.module} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-muted-foreground">{m.module}</span>
                    <span className="font-medium">{m.score != null ? `${m.score}%` : '—'} <span className="text-xs text-muted-foreground">({m.expected} due)</span></span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground italic">{data!.basis.fit_for_audit}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
