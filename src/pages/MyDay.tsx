import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sun, AlertTriangle, ArrowRight, ClipboardCheck, RefreshCw } from 'lucide-react';
import { statusMeta, statusLabel, isEffectivelyOverdue } from '@/lib/taskStatus';

interface MyDayItem {
  id: string;
  title: string;
  module: string;
  status: string;
  priority: string;
  importance: string;
  source_type: string;
  due_at: string | null;
  rejected_reason: string | null;
  process_instance_id: string | null;
  rank: number;
}

const RANK_LABELS = ['Overdue', 'Rejected — redo', 'Due today', 'Coming up'];

export default function MyDay() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<MyDayItem[]>([]);
  const [overdueCount, setOverdueCount] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const practiceId = user?.practiceId;

  const fetchMyDay = useCallback(async () => {
    if (!practiceId) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/practices/${practiceId}/my-day`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setOverdueCount(data.practiceOverdueCount);
    } catch {
      setError('Failed to load My Day.');
    } finally {
      setLoading(false);
    }
  }, [practiceId]);

  useEffect(() => { fetchMyDay(); }, [fetchMyDay]);

  const groups = [0, 1, 2, 3]
    .map((rank) => ({ rank, items: items.filter((i) => i.rank === rank) }))
    .filter((g) => g.items.length > 0);

  const myOverdue = items.filter((i) => isEffectivelyOverdue(i.status, i.due_at)).length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <Sun className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-bold">My Day</h1>
      </div>
      <p className="text-muted-foreground mb-4">Everything that needs you today — overdue first.</p>

      {/* Overdue banners */}
      {myOverdue > 0 && (
        <Card className="mb-3 border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              You have {myOverdue} overdue {myOverdue === 1 ? 'item' : 'items'}.
            </span>
          </CardContent>
        </Card>
      )}
      {overdueCount !== undefined && overdueCount > 0 && (
        <Card className="mb-4 border-amber-400/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 py-3">
            <ClipboardCheck className="h-5 w-5 text-amber-600" />
            <span className="text-sm">
              Practice-wide: <span className="font-semibold">{overdueCount}</span> overdue across all staff.
            </span>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : error ? (
        <Card><CardContent className="p-8 flex flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchMyDay()}>
            <RefreshCw className="h-4 w-4 mr-2" />Retry
          </Button>
        </CardContent></Card>
      ) : items.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nothing due right now. Enjoy the calm. ☀️</CardContent></Card>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.rank}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {RANK_LABELS[g.rank]} ({g.items.length})
              </h2>
              <div className="space-y-2">
                {g.items.map((item) => {
                  const meta = statusMeta(item.status);
                  return (
                    <Card
                      key={item.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        meta.rag === 'red' ? 'border-l-4 border-l-destructive' :
                        meta.rag === 'amber' ? 'border-l-4 border-l-amber-500' : ''
                      }`}
                      onClick={() => navigate(`/task/${item.id}`)}
                    >
                      <CardContent className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium truncate">{item.title}</span>
                            <Badge className={`${meta.badgeClass} text-xs`}>{statusLabel(item.status)}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                            {item.module && <span className="capitalize">{item.module.replace(/_/g, ' ')}</span>}
                            {item.source_type && item.source_type !== 'adhoc' && <span>· {item.source_type}</span>}
                            {item.due_at && <span>· Due {new Date(item.due_at).toLocaleDateString()}</span>}
                          </div>
                          {item.status === 'rejected' && item.rejected_reason && (
                            <p className="text-xs text-destructive mt-1">Rejected: {item.rejected_reason}</p>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" className="shrink-0">
                          Open <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
