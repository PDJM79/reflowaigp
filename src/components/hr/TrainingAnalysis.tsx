import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GraduationCap, Sparkles, Loader2, RefreshCw,
  AlertCircle, Clock, BarChart3, Lightbulb, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

// ── Types (mirror server/trainingAnalysis.ts) ──────────────────────────────
interface UrgentAction {
  staff_name: string;
  role: string;
  course: string;
  expired_date: string;
  days_overdue: number;
  is_mandatory: boolean;
}
interface UpcomingExpiration {
  staff_name: string;
  role: string;
  course: string;
  expiry_date: string;
  days_remaining: number;
  is_mandatory: boolean;
}
interface CourseGap {
  course: string;
  current_count: number;
  expired_count: number;
  total_count: number;
  compliance_pct: number;
  is_mandatory: boolean;
}
interface TrainingRecommendation {
  action: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
}
interface ComplianceSummary {
  overall_pct: number;
  mandatory_pct: number;
  rag: 'green' | 'amber' | 'red';
  total_records: number;
  expired_count: number;
  expiring_soon_count: number;
  summary: string;
}
interface TrainingAnalysis {
  compliance_summary: ComplianceSummary;
  urgent_actions: UrgentAction[];
  upcoming_expirations: UpcomingExpiration[];
  gap_analysis: CourseGap[];
  recommendations: TrainingRecommendation[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
const ragStyles = {
  green: { bg: 'bg-green-50 border-green-200', dot: 'bg-green-500', text: 'text-green-700', label: 'Compliant' },
  amber: { bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400', text: 'text-amber-700', label: 'Needs Attention' },
  red:   { bg: 'bg-destructive/10 border-destructive/30', dot: 'bg-destructive', text: 'text-destructive', label: 'At Risk' },
};

const priorityBadge = (p: string) => {
  if (p === 'high') return 'bg-destructive text-destructive-foreground';
  if (p === 'medium') return 'bg-amber-500 text-white';
  return 'bg-secondary text-secondary-foreground';
};

const expiryUrgency = (days: number) => {
  if (days <= 14) return 'text-destructive font-semibold';
  if (days <= 30) return 'text-amber-600 font-medium';
  return 'text-muted-foreground';
};

// ── Component ──────────────────────────────────────────────────────────────
export function TrainingAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<TrainingAnalysis | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async (force = false) => {
    if (!user?.practiceId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/practices/${user.practiceId}/training-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ force }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Request failed (${res.status})`);
      }

      const data: { analysis: TrainingAnalysis; cachedAt: string | null } = await res.json();
      setAnalysis(data.analysis);
      setCachedAt(data.cachedAt);

      toast({
        title: force ? 'Re-analysis complete' : 'Analysis complete',
        description: data.cachedAt
          ? 'Loaded from 24-hour cache.'
          : `${data.analysis.urgent_actions.length} urgent actions identified.`,
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
            <GraduationCap className="h-5 w-5 text-primary" />
            AI Training Analysis
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
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analysing…</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />AI Training Analysis</>
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
            <GraduationCap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Click <strong>AI Training Analysis</strong> to get a full compliance breakdown —
              expired records, upcoming renewals, gap analysis per course, and prioritised
              action recommendations.
            </p>
          </div>
        )}

        {analysis && (
          <div className="space-y-6">

            {/* ── Compliance Summary ── */}
            {(() => {
              const s = analysis.compliance_summary;
              const style = ragStyles[s.rag];
              return (
                <section>
                  <div className={`rounded-lg border p-4 space-y-3 ${style.bg}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${style.dot}`} />
                      <span className={`text-sm font-semibold ${style.text}`}>{style.label}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Mandatory compliance</p>
                        <p className={`text-2xl font-bold ${style.text}`}>{s.mandatory_pct}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Expired records</p>
                        <p className={`text-2xl font-bold ${s.expired_count > 0 ? 'text-destructive' : 'text-green-700'}`}>
                          {s.expired_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Expiring (90 days)</p>
                        <p className={`text-2xl font-bold ${s.expiring_soon_count > 0 ? 'text-amber-600' : 'text-green-700'}`}>
                          {s.expiring_soon_count}
                        </p>
                      </div>
                    </div>
                    {s.summary && (
                      <p className="text-sm leading-relaxed text-muted-foreground">{s.summary}</p>
                    )}
                  </div>
                </section>
              );
            })()}

            {/* ── Urgent Actions ── */}
            {analysis.urgent_actions.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Urgent Actions — Expired Training
                  <Badge className="bg-destructive text-destructive-foreground text-xs ml-1">
                    {analysis.urgent_actions.length}
                  </Badge>
                </h4>
                <div className="rounded-lg border border-destructive/30 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-destructive/10">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-destructive">Staff Member</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-destructive hidden sm:table-cell">Role</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-destructive">Course</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-destructive">Expired</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-destructive/10">
                      {analysis.urgent_actions.map((u, i) => (
                        <tr key={i} className="hover:bg-destructive/5">
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-destructive/90">{u.staff_name}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">{u.role}</div>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">{u.role}</td>
                          <td className="px-3 py-2.5">
                            <div>{u.course}</div>
                            {u.is_mandatory && (
                              <Badge className="bg-destructive/15 text-destructive text-xs border-0 px-1.5 py-0 mt-0.5">
                                Mandatory
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="text-destructive font-medium">
                              {format(parseISO(u.expired_date), 'd MMM yy')}
                            </div>
                            <div className="text-xs text-muted-foreground">{u.days_overdue}d overdue</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ── Upcoming Expirations ── */}
            {analysis.upcoming_expirations.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Upcoming Expirations — Next 90 Days
                  <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs ml-1">
                    {analysis.upcoming_expirations.length}
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {analysis.upcoming_expirations.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{e.staff_name}</span>
                          <span className="text-xs text-muted-foreground">({e.role})</span>
                          {e.is_mandatory && (
                            <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs px-1.5 py-0">
                              Mandatory
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.course}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm ${expiryUrgency(e.days_remaining)}`}>
                          {format(parseISO(e.expiry_date), 'd MMM yy')}
                        </div>
                        <div className={`text-xs ${expiryUrgency(e.days_remaining)}`}>
                          {e.days_remaining}d left
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Gap Analysis ── */}
            {analysis.gap_analysis.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  Compliance by Course
                </h4>
                <div className="space-y-2.5">
                  {analysis.gap_analysis.map((g, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="truncate font-medium">{g.course}</span>
                          {g.is_mandatory && (
                            <span className="text-xs text-muted-foreground flex-shrink-0">(Mandatory)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <span className={`text-sm font-semibold ${
                            g.compliance_pct >= 90 ? 'text-green-700' :
                            g.compliance_pct >= 70 ? 'text-amber-600' :
                            'text-destructive'
                          }`}>
                            {g.compliance_pct}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {g.current_count}/{g.total_count}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            g.compliance_pct >= 90 ? 'bg-green-500' :
                            g.compliance_pct >= 70 ? 'bg-amber-400' :
                            'bg-destructive'
                          }`}
                          style={{ width: `${g.compliance_pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

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

            {/* All-clear state */}
            {analysis.urgent_actions.length === 0 &&
              analysis.upcoming_expirations.length === 0 &&
              analysis.compliance_summary.rag === 'green' && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700">
                  All training records are current. No immediate actions required.
                </p>
              </div>
            )}

          </div>
        )}
      </CardContent>
    </Card>
  );
}
