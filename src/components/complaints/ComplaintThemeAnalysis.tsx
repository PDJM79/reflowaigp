import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles, Loader2, RefreshCw, AlertCircle,
  TrendingUp, Target, BarChart3, Lightbulb, ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// ── Types (mirror server/complaintAnalysis.ts) ─────────────────────────────
interface ComplaintTheme {
  name: string;
  count: number;
  severity_level: 'high' | 'medium' | 'low';
  description: string;
}
interface RootCause {
  cause: string;
  complaints_affected: number;
}
interface SlaPerformance {
  ack_compliance_pct: number;
  final_compliance_pct: number;
  status: 'green' | 'amber' | 'red';
  summary: string;
}
interface Recommendation {
  action: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
}
interface RiskArea {
  description: string;
  complaint_ref: string;
  risk_level: 'high' | 'critical';
}
interface ComplaintAnalysis {
  themes: ComplaintTheme[];
  root_causes: RootCause[];
  sla_performance: SlaPerformance;
  recommendations: Recommendation[];
  risk_areas: RiskArea[];
}

// ── Small helpers ──────────────────────────────────────────────────────────
const themeSeverityStyle = (level: string) => {
  if (level === 'high') return 'bg-destructive/10 text-destructive border-destructive/30';
  if (level === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-muted text-muted-foreground border-border';
};

const priorityBadge = (p: string) => {
  if (p === 'high') return 'bg-destructive text-destructive-foreground';
  if (p === 'medium') return 'bg-amber-500 text-white';
  return 'bg-secondary text-secondary-foreground';
};

const trafficLight = (status: 'green' | 'amber' | 'red') => ({
  green: { dot: 'bg-green-500', label: 'Good', text: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  amber: { dot: 'bg-amber-400', label: 'Needs Attention', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  red:   { dot: 'bg-destructive', label: 'At Risk', text: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' },
}[status]);

// ── Component ──────────────────────────────────────────────────────────────
export function ComplaintThemeAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ComplaintAnalysis | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async (force = false) => {
    if (!user?.practiceId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/practices/${user.practiceId}/complaint-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ force }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Request failed (${res.status})`);
      }

      const data: { analysis: ComplaintAnalysis; cachedAt: string | null } = await res.json();
      setAnalysis(data.analysis);
      setCachedAt(data.cachedAt);

      toast({
        title: force ? 'Re-analysis complete' : 'Analysis complete',
        description: data.cachedAt
          ? 'Loaded from 24-hour cache.'
          : `${data.analysis.themes.length} themes identified.`,
      });
    } catch (err: any) {
      const msg: string = err.message ?? 'Unknown error';
      setError(msg);
      toast({ title: 'Analysis failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Theme Analysis
          </CardTitle>
          {cachedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Last analysed: {format(new Date(cachedAt), 'd MMM yyyy, HH:mm')}
            </p>
          )}
        </div>

        {analysis ? (
          <Button variant="outline" size="sm" onClick={() => runAnalysis(true)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-1.5">Re-analyse</span>
          </Button>
        ) : (
          <Button size="sm" onClick={() => runAnalysis(false)} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analysing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyse Complaints
              </>
            )}
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!analysis && !error && (
          <div className="text-center py-10">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Click <strong>Analyse Complaints</strong> to identify recurring themes, root causes,
              SLA performance, and escalation risks using AI.
            </p>
          </div>
        )}

        {/* Results */}
        {analysis && (
          <div className="space-y-6">

            {/* ── Themes ── */}
            {analysis.themes.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Recurring Themes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.themes.map((theme, i) => (
                    <div
                      key={i}
                      title={theme.description}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm cursor-default ${themeSeverityStyle(theme.severity_level)}`}
                    >
                      <span className="font-medium">{theme.name}</span>
                      <span className="text-xs opacity-70 font-semibold">×{theme.count}</span>
                    </div>
                  ))}
                </div>
                {/* Theme description tooltip on hover is set — also show descriptions below */}
                <div className="mt-3 space-y-1.5">
                  {analysis.themes.map((theme, i) => (
                    theme.description && (
                      <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground">{theme.name}:</span> {theme.description}
                      </p>
                    )
                  ))}
                </div>
              </section>
            )}

            {/* ── Root Causes ── */}
            {analysis.root_causes.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <Target className="h-4 w-4 text-amber-600" />
                  Root Causes
                </h4>
                <ol className="space-y-2">
                  {analysis.root_causes.map((rc, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <span className="leading-relaxed">{rc.cause}</span>
                        {rc.complaints_affected > 0 && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            ({rc.complaints_affected} complaint{rc.complaints_affected !== 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* ── SLA Performance ── */}
            {(() => {
              const sla = analysis.sla_performance;
              const tl = trafficLight(sla.status);
              return (
                <section>
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    SLA Performance
                  </h4>
                  <div className={`rounded-lg border p-4 space-y-3 ${tl.bg}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${tl.dot}`} />
                      <span className={`text-sm font-semibold ${tl.text}`}>{tl.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">ACK (48 h target)</p>
                        <p className={`text-2xl font-bold ${sla.ack_compliance_pct >= 80 ? 'text-green-700' : sla.ack_compliance_pct >= 60 ? 'text-amber-700' : 'text-destructive'}`}>
                          {sla.ack_compliance_pct}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Final response (30-day)</p>
                        <p className={`text-2xl font-bold ${sla.final_compliance_pct >= 80 ? 'text-green-700' : sla.final_compliance_pct >= 60 ? 'text-amber-700' : 'text-destructive'}`}>
                          {sla.final_compliance_pct}%
                        </p>
                      </div>
                    </div>
                    {sla.summary && (
                      <p className={`text-xs leading-relaxed ${tl.text}`}>{sla.summary}</p>
                    )}
                  </div>
                </section>
              );
            })()}

            {/* ── Recommendations ── */}
            {analysis.recommendations.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Recommendations
                </h4>
                <div className="space-y-2.5">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug flex-1">{rec.action}</p>
                        <Badge className={`text-xs flex-shrink-0 ${priorityBadge(rec.priority)}`}>
                          {rec.priority}
                        </Badge>
                      </div>
                      {rec.rationale && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{rec.rationale}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Risk Areas ── */}
            {analysis.risk_areas.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  Escalation Risk Areas
                </h4>
                <div className="space-y-2">
                  {analysis.risk_areas.map((risk, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-3"
                    >
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-destructive uppercase tracking-wide">
                            {risk.risk_level}
                          </span>
                          {risk.complaint_ref && (
                            <span className="text-xs text-muted-foreground">· {risk.complaint_ref}</span>
                          )}
                        </div>
                        <p className="text-sm text-destructive/90 leading-relaxed">{risk.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </CardContent>
    </Card>
  );
}
