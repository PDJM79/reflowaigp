import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { CADENCE_OPTIONS, cadenceLabel, isLessFrequent } from '@/lib/cadenceOrder';

interface LibraryLogbook {
  id: string;
  title: string;
  cadence: string;
  section: { name: string };
  selection: any | null;
}

interface TeamUser { id: string; name: string; role?: string }
interface RoleAssignment { role: string; userId: string | null; assignedName: string | null }

interface ScheduleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  logbook: LibraryLogbook | null;
  schedulerEnabled: boolean;
}

const WEEKDAYS = [
  { value: '1', label: 'Monday' }, { value: '2', label: 'Tuesday' }, { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' }, { value: '5', label: 'Friday' }, { value: '6', label: 'Saturday' }, { value: '0', label: 'Sunday' },
];

type AssigneeMode = 'unassigned' | 'person' | 'role';

export function ScheduleEditorModal({ isOpen, onClose, onSaved, logbook, schedulerEnabled }: ScheduleEditorModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [roles, setRoles] = useState<RoleAssignment[]>([]);

  const [cadence, setCadence] = useState<string>('monthly');
  const [preferredDay, setPreferredDay] = useState<string>('1');
  const [preferredDate, setPreferredDate] = useState<string>('1');
  const [dueWindowHours, setDueWindowHours] = useState<string>('24');
  const [earlyStartHours, setEarlyStartHours] = useState<string>('12');
  const [assigneeMode, setAssigneeMode] = useState<AssigneeMode>('unassigned');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [assigneeRole, setAssigneeRole] = useState<string>('');
  const [requiresReview, setRequiresReview] = useState(false);
  const [adHocOnly, setAdHocOnly] = useState(false);
  const [nextReviewDate, setNextReviewDate] = useState<string>('');

  const curatedCadence = logbook?.cadence ?? 'monthly';

  useEffect(() => {
    if (!isOpen || !logbook || !user?.practiceId) return;
    // Load users + role assignments for the assignee pickers.
    Promise.all([
      fetch(`/api/practices/${user.practiceId}/users`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/practices/${user.practiceId}/role-assignments`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([u, r]) => {
      setUsers(Array.isArray(u) ? u.filter((x: any) => x.isActive !== false) : []);
      setRoles(Array.isArray(r) ? r : []);
    }).catch(() => { /* pickers degrade to empty; non-fatal */ });

    const sel = logbook.selection;
    setCadence(sel?.cadenceOverride ?? logbook.cadence ?? 'monthly');
    setPreferredDay(sel?.preferredDay != null ? String(sel.preferredDay) : '1');
    setPreferredDate(sel?.preferredDate != null ? String(sel.preferredDate) : '1');
    setDueWindowHours(String(sel?.dueWindowHours ?? 24));
    setEarlyStartHours(String(sel?.earlyStartHours ?? 12));
    setRequiresReview(!!sel?.requiresReview);
    setAdHocOnly(!!sel?.adHocOnly);
    setNextReviewDate(sel?.nextReviewDate ?? '');
    if (sel?.defaultAssigneeId) { setAssigneeMode('person'); setAssigneeId(sel.defaultAssigneeId); setAssigneeRole(''); }
    else if (sel?.defaultAssigneeRole) { setAssigneeMode('role'); setAssigneeRole(sel.defaultAssigneeRole); setAssigneeId(''); }
    else { setAssigneeMode('unassigned'); setAssigneeId(''); setAssigneeRole(''); }
  }, [isOpen, logbook, user?.practiceId]);

  const showDay = cadence === 'weekly' || cadence === 'fortnightly';
  const showDate = ['monthly', 'termly', 'quarterly', 'six_monthly', 'annual', 'biennial', 'triennial', 'five_yearly'].includes(cadence);
  const showPeriodicReview = cadence === 'periodic_review';
  const floorWarning = isLessFrequent(cadence, curatedCadence);

  const handleSave = async () => {
    if (!logbook || !user?.practiceId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        curatedLogbookId: logbook.id,
        cadenceOverride: cadence === curatedCadence ? null : cadence,
        preferredDay: showDay ? Number(preferredDay) : null,
        preferredDate: showDate ? Number(preferredDate) : null,
        dueWindowHours: Number(dueWindowHours) || 24,
        earlyStartHours: Number(earlyStartHours) || 12,
        requiresReview,
        adHocOnly,
        defaultAssigneeId: assigneeMode === 'person' ? (assigneeId || null) : null,
        defaultAssigneeRole: assigneeMode === 'role' ? (assigneeRole || null) : null,
        nextReviewDate: showPeriodicReview ? (nextReviewDate || null) : null,
      };
      const existingId = logbook.selection?.id;
      const url = existingId
        ? `/api/practices/${user.practiceId}/logbook-selections/${existingId}`
        : `/api/practices/${user.practiceId}/logbook-selections`;
      const method = existingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(typeof err?.error === 'string' ? err.error : 'Failed to save schedule');
      }
      toast.success(`${logbook.title} scheduled`);
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  if (!logbook) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Schedule: {logbook.title}</DialogTitle>
          <DialogDescription>
            {logbook.section.name} · recommended cadence <strong>{cadenceLabel(curatedCadence)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!schedulerEnabled && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Scheduling is saved, but occurrences won't be generated until the scheduler is
                enabled for this practice.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Cadence</Label>
            <Select value={cadence} onValueChange={setCadence}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CADENCE_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {floorWarning && (
              <Alert variant="default" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Scheduled less often than the recommended <strong>{cadenceLabel(curatedCadence)}</strong>.
                  You can proceed, but this may weaken compliance.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {showDay && (
            <div className="space-y-2">
              <Label>Preferred day</Label>
              <Select value={preferredDay} onValueChange={setPreferredDay}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {showDate && (
            <div className="space-y-2">
              <Label>Preferred date (1–28)</Label>
              <Input type="number" min={1} max={28} value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)} />
            </div>
          )}

          {showPeriodicReview && (
            <div className="space-y-2">
              <Label>Next review date</Label>
              <Input type="date" value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                Periodic-review logbooks are not auto-scheduled; this date is surfaced as a reminder.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Due window (hours)</Label>
              <Input type="number" min={1} value={dueWindowHours} onChange={(e) => setDueWindowHours(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Early start (hours)</Label>
              <Input type="number" min={0} value={earlyStartHours} onChange={(e) => setEarlyStartHours(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Default assignee</Label>
            <Select value={assigneeMode} onValueChange={(v) => setAssigneeMode(v as AssigneeMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned (triage later)</SelectItem>
                <SelectItem value="person">A specific person</SelectItem>
                <SelectItem value="role">A role (resolved when generated)</SelectItem>
              </SelectContent>
            </Select>
            {assigneeMode === 'person' && (
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="Choose a person" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {assigneeMode === 'role' && (
              <Select value={assigneeRole} onValueChange={setAssigneeRole}>
                <SelectTrigger><SelectValue placeholder="Choose a role" /></SelectTrigger>
                <SelectContent>
                  {roles.length === 0 ? (
                    <SelectItem value="__none" disabled>No roles assigned yet</SelectItem>
                  ) : roles.map((r) => (
                    <SelectItem key={r.role} value={r.role}>
                      {r.role.replace(/_/g, ' ')}{r.assignedName ? ` — ${r.assignedName}` : ' (no holder)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="requires-review">Requires manager review</Label>
              <p className="text-xs text-muted-foreground">Completions await manager sign-off.</p>
            </div>
            <Switch id="requires-review" checked={requiresReview} onCheckedChange={setRequiresReview} />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Saving…' : logbook.selection ? 'Update schedule' : 'Enable & schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
