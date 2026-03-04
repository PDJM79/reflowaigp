import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertTriangle, Zap, Calendar, RefreshCw, ChevronLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AIPriorities, FocusArea, QuickWin } from './types';

// ── Loading messages cycling every 3s ─────────────────────────────────────────
const LOADING_MSGS = [
  'Reviewing your CQC inspection findings…',
  'Analysing your compliance requirements…',
  'Identifying priority areas…',
  'Building your personalised action plan…',
];

interface Props {
  sessionId: string;
  practiceId: string | null;
  modulesEnabled: string[];
  roomCount: number;
  cleaningTaskCount: number;
  onBack: () => void;
  onComplete: () => void;
  completing: boolean;
}

// ── Focus area card ────────────────────────────────────────────────────────────
function FocusCard({ item }: { item: FocusArea }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-1">
      <p className="text-sm font-semibold text-red-900">{item.task}</p>
      <p className="text-xs text-red-700">{item.reason}</p>
      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 font-medium">{item.deadline}</span>
    </div>
  );
}

// ── Quick win card ────────────────────────────────────────────────────────────
function QuickWinCard({ item }: { item: QuickWin }) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-1">
      <p className="text-sm font-semibold text-green-900">{item.task}</p>
      <p className="text-xs text-green-700">{item.reason}</p>
      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 font-medium">{item.timeEstimate}</span>
    </div>
  );
}

export function Step7Review({ sessionId, practiceId, modulesEnabled, roomCount, cleaningTaskCount, onBack, onComplete, completing }: Props) {
  const { toast } = useToast();
  const [priorities, setPriorities] = useState<AIPriorities | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromFallback, setFromFallback] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cycle loading messages
  useEffect(() => {
    if (!loading) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => setMsgIdx(i => (i + 1) % LOADING_MSGS.length), 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loading]);

  const fetchPriorities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/ai-prioritize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? `Request failed (${res.status})`);
      setPriorities(d.priorities);
      setFromFallback(d.fromFallback ?? false);
    } catch (err: any) {
      toast({ title: 'Could not load recommendations', description: err.message, variant: 'destructive' });
      setFromFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPriorities(); }, [sessionId]);

  const cleaningOn = modulesEnabled.includes('cleaning');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          Step 7 — Your Personalised Action Plan
        </CardTitle>
        <CardDescription>
          Based on your setup, we've identified your most important compliance priorities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-center max-w-xs transition-all">{LOADING_MSGS[msgIdx]}</p>
          </div>
        )}

        {/* Fallback warning banner */}
        {!loading && fromFallback && (
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-800 font-medium">Showing general recommendations</p>
              <p className="text-amber-700 text-xs mt-0.5">Personalised AI analysis is temporarily unavailable.</p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs flex-shrink-0" onClick={fetchPriorities}>
              <RefreshCw className="h-3 w-3 mr-1" />Retry
            </Button>
          </div>
        )}

        {/* Results */}
        {!loading && priorities && (
          <div className="space-y-6">
            {/* Personal note */}
            {priorities.personalNote && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">{priorities.personalNote}</p>
            )}

            {/* Focus areas */}
            {priorities.focusAreas?.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Focus Areas — Next 30 Days</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {priorities.focusAreas.map((item, i) => <FocusCard key={i} item={item} />)}
                </div>
              </section>
            )}

            {/* Quick wins */}
            {priorities.quickWins?.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-500" />
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Quick Wins — This Week</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {priorities.quickWins.map((item, i) => <QuickWinCard key={i} item={item} />)}
                </div>
              </section>
            )}

            {/* Ongoing schedule summary */}
            {priorities.ongoingSummary && (
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Ongoing Compliance</h3>
                </div>
                <div className="rounded-lg bg-muted/40 border p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {[
                    ['Weekly tasks',    priorities.ongoingSummary.weeklyTasks],
                    ['Monthly tasks',   priorities.ongoingSummary.monthlyTasks],
                    ['Annual tasks',    priorities.ongoingSummary.annualTasks],
                    ...(cleaningOn ? [['Rooms configured', priorities.ongoingSummary.totalRooms] as const] : []),
                    ...(cleaningOn ? [['Cleaning tasks/day', priorities.ongoingSummary.cleaningTasksPerDay] as const] : []),
                  ].map(([label, value]) => (
                    <div key={String(label)} className="text-center">
                      <p className="text-xl font-bold text-foreground">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Launch summary + CTA */}
        {!loading && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-5 space-y-3 text-center">
            <p className="font-semibold text-foreground">Ready to launch your practice?</p>
            <p className="text-sm text-muted-foreground">
              {modulesEnabled.length} module{modulesEnabled.length !== 1 ? 's' : ''} active
              {roomCount > 0 && ` · ${roomCount} room${roomCount !== 1 ? 's' : ''} configured`}
              {cleaningTaskCount > 0 && ` · ${cleaningTaskCount} cleaning task${cleaningTaskCount !== 1 ? 's' : ''}`}
            </p>
            <Button size="lg" onClick={onComplete} disabled={completing} className="w-full sm:w-auto mt-1">
              {completing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Complete Setup &amp; Go to Dashboard
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" onClick={onBack} disabled={completing}>
            <ChevronLeft className="h-4 w-4 mr-1" />Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
