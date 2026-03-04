import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronRight, ChevronLeft, Loader2, Sparkles, Settings, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Step6CleaningSection } from './Step6CleaningSection';
import type { Room, CleaningTemplate, TaskConfig, CleaningFrequency } from './types';

// ── Map Step 5 room types to cleaning_templates.room_type DB values ───────────
const STEP5_TO_TEMPLATE: Record<string, string> = {
  consultation: 'consulting_room', bathroom: 'toilets',
  waiting_room: 'reception',       staff_area: 'staff_room',
  kitchen: 'staff_room',           utility: 'corridors',
};

const ROOM_DISPLAY: Record<string, string> = {
  consultation: 'Consultation / Clinical Rooms', bathroom: 'Bathrooms / WCs',
  waiting_room: 'Waiting Areas',                 staff_area: 'Staff / Admin Areas',
  kitchen: 'Kitchen / Break Room',               utility: 'Utility / Storage Rooms',
  custom: 'Custom Rooms',
};

// Normalise raw DB frequency to the closest CleaningFrequency enum value
const normalizeFreq = (f: string): CleaningFrequency =>
  ({ between_patients: '2x_daily', twice_daily: '2x_daily', as_required: 'daily',
     daily: 'daily', weekly: 'weekly', monthly: 'monthly' } as Record<string, CleaningFrequency>)[f] ?? 'daily';

// For "Minimum Compliance" mode: relax twice-daily tasks to daily, keep others
const minimumFreq = (f: CleaningFrequency): CleaningFrequency =>
  f === '2x_daily' ? 'daily' : f;

type Mode = 'recommended' | 'minimum' | 'custom';

// Record<step5RoomType, TaskConfig[]>
type ScheduleState = Record<string, TaskConfig[]>;

interface Props {
  sessionId: string;
  rooms: Room[];
  regulator: 'cqc' | 'hiw';
  onBack: () => void;
  onComplete: () => void;
}

export function Step6Cleaning({ sessionId, rooms, regulator, onBack, onComplete }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<CleaningTemplate[]>([]);
  const [schedules, setSchedules] = useState<ScheduleState>({});
  const [mode, setMode] = useState<Mode>('recommended');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Get unique Step 5 room types that have at least one room
  const activeRoomTypes = [...new Set(rooms.map(r => r.type))].filter(t => t !== 'custom');
  const roomCountOf = (type: string) => rooms.filter(r => r.type === type).length;

  // Build initial schedule from templates for a given frequency transform
  const buildSchedules = useCallback((tmplList: CleaningTemplate[], freqFn: (f: CleaningFrequency) => CleaningFrequency): ScheduleState => {
    const byDbType = tmplList.reduce<Record<string, CleaningTemplate[]>>((acc, t) => ({ ...acc, [t.roomType]: [...(acc[t.roomType] ?? []), t] }), {});
    return Object.fromEntries(activeRoomTypes.map(type => {
      const dbType = STEP5_TO_TEMPLATE[type] ?? '';
      const tasks: TaskConfig[] = (byDbType[dbType] ?? []).map(t => ({
        templateId: t.id, taskName: t.taskName,
        frequency: freqFn(normalizeFreq(t.frequency)),
        requiresPhoto: type === 'consultation',  // clinical rooms default to photo
      }));
      return [type, tasks];
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms]);

  useEffect(() => {
    fetch('/api/onboarding/cleaning-templates')
      .then(r => r.json())
      .then(d => {
        const tmpl: CleaningTemplate[] = d.templates ?? [];
        setTemplates(tmpl);
        setSchedules(buildSchedules(tmpl, f => f));
      })
      .catch(() => toast({ title: 'Could not load cleaning templates', variant: 'destructive' }))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyMode = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === 'recommended') setSchedules(buildSchedules(templates, f => f));
    if (newMode === 'minimum')     setSchedules(buildSchedules(templates, minimumFreq));
    // 'custom' keeps current values but enables dropdowns
  };

  const onTaskChange = (roomType: string, templateId: string, changes: Partial<TaskConfig>) => {
    setSchedules(prev => ({ ...prev, [roomType]: (prev[roomType] ?? []).map(t => t.templateId === templateId ? { ...t, ...changes } : t) }));
  };

  // ── Summary calculation ───────────────────────────────────────────────────
  const FREQ_PER_DAY: Record<CleaningFrequency, number> = { '2x_daily': 2, 'daily': 1, 'every_other_day': 0.5, 'weekly': 1/7, 'fortnightly': 1/14, 'monthly': 1/30 };
  let dailyTasks = 0, weeklyTasks = 0, monthlyTasks = 0, totalRooms = 0;
  for (const [type, tasks] of Object.entries(schedules)) {
    const n = roomCountOf(type);
    totalRooms += n;
    for (const t of tasks) {
      const perDay = FREQ_PER_DAY[t.frequency] ?? 0;
      if (perDay >= 1) dailyTasks += n;
      else if (perDay >= 1/7) weeklyTasks += n;
      else monthlyTasks += n;
    }
  }
  const estimatedMins = Math.round(dailyTasks * 5);

  const handleContinue = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(schedules).map(([roomType, tasks]) => ({
        roomType,
        tasks: tasks.map(({ templateId, frequency, requiresPhoto }) => ({ templateId, frequency, requiresPhoto })),
      }));
      const res = await fetch(`/api/onboarding/sessions/${sessionId}/cleaning-schedule`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schedules: payload }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `Save failed (${res.status})`); }
      onComplete();
    } catch (err: any) {
      toast({ title: 'Could not save cleaning schedule', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Step 6 — Cleaning Schedule</CardTitle>
        <CardDescription>We've pre-loaded {regulator.toUpperCase()} best practice tasks for each room type. Adjust frequency and evidence requirements to suit your practice.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Quick setup buttons */}
        <div className="flex flex-wrap gap-2">
          {([['recommended', 'Use Recommended Defaults', Sparkles], ['minimum', 'Minimum Compliance', BarChart3], ['custom', 'Custom', Settings]] as const).map(([m, label, Icon]) => (
            <button key={m} type="button" onClick={() => applyMode(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
        {mode === 'minimum' && <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Minimum compliance sets all twice-daily tasks to daily. Ensure this meets your local {regulator.toUpperCase()} requirements.</p>}

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading templates…</span></div>
        ) : (
          <div className="space-y-3">
            {activeRoomTypes.map(type => (
              <Step6CleaningSection
                key={type}
                displayName={ROOM_DISPLAY[type] ?? type}
                roomCount={roomCountOf(type)}
                tasks={schedules[type] ?? []}
                isCustomMode={mode === 'custom'}
                onTaskChange={(templateId, changes) => onTaskChange(type, templateId, changes)}
              />
            ))}
            {activeRoomTypes.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No room types configured. Go back to add rooms.</p>}
          </div>
        )}

        {/* Summary */}
        {!loading && totalRooms > 0 && (
          <div className="rounded-lg bg-muted/40 border p-4 space-y-1 text-sm">
            <p className="font-semibold text-foreground">Based on your selections:</p>
            <p className="text-muted-foreground"><strong className="text-foreground">{dailyTasks}</strong> daily task{dailyTasks !== 1 ? 's' : ''}, <strong className="text-foreground">{weeklyTasks}</strong> weekly, <strong className="text-foreground">{monthlyTasks}</strong> monthly across <strong className="text-foreground">{totalRooms}</strong> rooms</p>
            <p className="text-muted-foreground">Estimated daily cleaning time: <strong className="text-foreground">~{estimatedMins < 60 ? `${estimatedMins} min` : `${(estimatedMins / 60).toFixed(1)} hrs`}</strong></p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
          <Button onClick={handleContinue} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Continue<ChevronRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
