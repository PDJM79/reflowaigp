import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { BackButton } from '@/components/ui/back-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookOpen, Search, AlertTriangle, RefreshCw, Loader2, Info, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { ScheduleEditorModal } from '@/components/logbooks/ScheduleEditorModal';
import { cadenceLabel } from '@/lib/cadenceOrder';

interface LibraryLogbook {
  id: string;
  code: string;
  title: string;
  cadence: string;
  triggers: string[];
  applicableTo: string[];
  nationCoverage: string[];
  section: { id: string; name: string; slug: string; sortOrder: number };
  selection: any | null;
}

const APPLICABILITY_COLORS: Record<string, string> = {
  all: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  dispensing: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  branch: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
};

export default function Logbooks() {
  const { user } = useAuth();
  const [library, setLibrary] = useState<LibraryLogbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const [editing, setEditing] = useState<LibraryLogbook | null>(null);

  const fetchLibrary = useCallback(async () => {
    if (!user?.practiceId) return;
    try {
      setLoading(true);
      setLoadError(false);
      const [libRes, practiceRes] = await Promise.all([
        fetch(`/api/practices/${user.practiceId}/curated-logbooks`, { credentials: 'include' }),
        fetch(`/api/practices/${user.practiceId}`, { credentials: 'include' }),
      ]);
      if (!libRes.ok) throw new Error('Failed to load library');
      const lib = await libRes.json();
      setLibrary(Array.isArray(lib) ? lib : []);
      if (practiceRes.ok) {
        const p = await practiceRes.json();
        setSchedulerEnabled(p?.metadata?.scheduler_enabled === true);
      }
    } catch (error) {
      console.error('Error loading logbook library:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.practiceId]);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  const handleToggle = async (lb: LibraryLogbook, enable: boolean) => {
    if (!user?.practiceId) return;
    if (enable && !lb.selection) {
      // Enabling for the first time opens the Schedule Editor.
      setEditing(lb);
      return;
    }
    try {
      if (enable) {
        // Re-enable an existing (disabled) selection.
        await fetch(`/api/practices/${user.practiceId}/logbook-selections/${lb.selection.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ isEnabled: true }),
        });
      } else {
        // Disable (soft) — keeps schedule settings.
        await fetch(`/api/practices/${user.practiceId}/logbook-selections/${lb.selection.id}`, {
          method: 'DELETE', credentials: 'include',
        });
      }
      toast.success(enable ? `${lb.title} enabled` : `${lb.title} disabled`);
      fetchLibrary();
    } catch {
      toast.error('Failed to update logbook');
    }
  };

  const filtered = library.filter((lb) =>
    !search || `${lb.title} ${lb.section.name}`.toLowerCase().includes(search.toLowerCase())
  );
  const bySection = filtered.reduce<Record<string, LibraryLogbook[]>>((acc, lb) => {
    (acc[lb.section.name] ??= []).push(lb);
    return acc;
  }, {});
  const enabledCount = library.filter((lb) => lb.selection?.isEnabled).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-7 w-7" /> Compliance Logbooks
            </h1>
          </div>
          <p className="text-muted-foreground">
            Enable the compliance logbooks your practice needs and set how often each runs.
            {' '}{enabledCount} enabled.
          </p>
        </div>
      </div>

      {!schedulerEnabled && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            The scheduler is not enabled for this practice yet, so enabling a logbook saves its
            schedule but won't generate tasks until the scheduler is switched on.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search logbooks…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading library…</div>
      ) : loadError ? (
        <Card><CardContent className="py-12 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-destructive mb-3" />
          <p className="font-medium mb-1">Failed to load the logbook library</p>
          <p className="text-muted-foreground mb-4">Check your connection and try again.</p>
          <Button variant="outline" onClick={fetchLibrary}><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
        </CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3" />
          <p>{search ? 'No logbooks match your search.' : 'No curated logbooks are available for this practice.'}</p>
        </CardContent></Card>
      ) : (
        Object.entries(bySection).map(([sectionName, items]) => (
          <Card key={sectionName}>
            <CardHeader><CardTitle className="text-lg">{sectionName}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {items.map((lb) => {
                const enabled = !!lb.selection?.isEnabled;
                const effectiveCadence = lb.selection?.cadenceOverride ?? lb.cadence;
                return (
                  <div key={lb.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{lb.title}</span>
                        <Badge variant="secondary" className="text-xs">{cadenceLabel(effectiveCadence)}</Badge>
                        {lb.selection?.cadenceOverride && lb.selection.cadenceOverride !== lb.cadence && (
                          <Badge variant="outline" className="text-xs">overridden</Badge>
                        )}
                        {(lb.applicableTo ?? []).map((a) => (
                          <Badge key={a} className={`text-xs ${APPLICABILITY_COLORS[a] ?? ''}`}>{a}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Nations: {(lb.nationCoverage ?? []).join(', ') || 'all'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {enabled && (
                        <Button variant="ghost" size="sm" onClick={() => setEditing(lb)} title="Edit schedule">
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Switch checked={enabled} onCheckedChange={(v) => handleToggle(lb, v)} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))
      )}

      <ScheduleEditorModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        onSaved={fetchLibrary}
        logbook={editing}
        schedulerEnabled={schedulerEnabled}
      />
    </div>
  );
}
