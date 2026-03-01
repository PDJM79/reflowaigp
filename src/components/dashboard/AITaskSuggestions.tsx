import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Lightbulb, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function AITaskSuggestions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tips, setTips] = useState<string[]>([]);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTips = async (force = false) => {
    if (!user?.practiceId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/practices/${user.practiceId}/ai-tips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ force }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${response.status})`);
      }

      const data: { tips: string[]; cachedAt: string | null } = await response.json();
      setTips(data.tips ?? []);
      setCachedAt(data.cachedAt);

      if (!force && data.cachedAt) {
        toast({ title: 'Loaded from cache', description: 'Showing tips from a previous analysis.' });
      } else {
        toast({ title: 'Analysis complete', description: `${(data.tips ?? []).length} improvement tips generated.` });
      }
    } catch (err: any) {
      const msg: string = err.message ?? 'Unknown error';
      setError(msg);
      toast({ title: 'Could not generate tips', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const hasTips = tips.length > 0;

  return (
    <Card data-testid="card-ai-task-suggestions">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            AI Improvement Tips
          </CardTitle>
          {cachedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Last analysed: {format(new Date(cachedAt), 'd MMM yyyy, HH:mm')}
            </p>
          )}
        </div>

        {hasTips ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTips(true)}
            disabled={loading}
            data-testid="button-refresh-tips"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-1.5">Refresh</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => fetchTips(false)}
            disabled={loading}
            data-testid="button-get-tips"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analysing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Get AI Tips
              </>
            )}
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {error ? (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" data-testid="text-ai-tips-error">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        ) : hasTips ? (
          <ol className="space-y-3" data-testid="list-ai-tips">
            {tips.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/40"
                data-testid={`tip-item-${i}`}
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed">{tip}</p>
              </li>
            ))}
          </ol>
        ) : (
          <div className="text-center py-8" data-testid="text-ai-tips-empty">
            <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Click <strong>Get AI Tips</strong> to receive personalised, actionable recommendations
              based on your practice's current compliance data.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
