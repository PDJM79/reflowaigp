import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Minus, ChevronRight, ChevronLeft, Loader2, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Step5RoomRow } from './Step5RoomRow';
import type { Room, RoomType, ZoneType } from './types';

// ── Room type configuration (typed constant — not inline JSX) ─────────────────
interface RoomTypeDef { id: RoomType; label: string; zone: ZoneType; prefix: string; default: number; }
const ROOM_TYPES: RoomTypeDef[] = [
  { id: 'consultation', label: 'Consultation / Clinical Rooms', zone: 'clinical', prefix: 'Consultation',  default: 4 },
  { id: 'bathroom',     label: 'Bathrooms / WCs',               zone: 'patient',  prefix: 'Bathroom',      default: 2 },
  { id: 'waiting_room', label: 'Waiting Areas',                  zone: 'patient',  prefix: 'Waiting Room',  default: 1 },
  { id: 'staff_area',   label: 'Staff / Admin Areas',            zone: 'staff',    prefix: 'Staff Room',    default: 2 },
  { id: 'kitchen',      label: 'Kitchen / Break Room',           zone: 'staff',    prefix: 'Kitchen',       default: 1 },
  { id: 'utility',      label: 'Utility / Storage Rooms',        zone: 'utility',  prefix: 'Utility Room',  default: 1 },
];

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

function buildRooms(defs: RoomTypeDef[]): Room[] {
  return defs.flatMap(rt =>
    Array.from({ length: rt.default }, (_, i) => ({
      id: makeId(), name: `${rt.prefix} ${i + 1}`, type: rt.id, zone: rt.zone,
    }))
  );
}

interface Props {
  sessionId: string;
  onBack: () => void;
  onComplete: (rooms: Room[]) => void;
}

export function Step5Rooms({ sessionId, onBack, onComplete }: Props) {
  const { toast } = useToast();
  const [counts, setCounts]           = useState<Record<string, number>>(() => Object.fromEntries(ROOM_TYPES.map(rt => [rt.id, rt.default])));
  const [rooms, setRooms]             = useState<Room[]>(() => buildRooms(ROOM_TYPES));
  const [customLabel, setCustomLabel] = useState('');
  const [customCount, setCustomCount] = useState(1);
  const [saving, setSaving]           = useState(false);

  // Add or remove rooms when a type stepper changes.
  // Preserves existing room names — only appends/removes from the tail of each type's group.
  const onCountChange = (rt: RoomTypeDef, delta: number) => {
    const next = Math.max(0, Math.min(20, (counts[rt.id] ?? 0) + delta));
    setCounts(prev => ({ ...prev, [rt.id]: next }));
    if (delta > 0) {
      const existing = rooms.filter(r => r.type === rt.id);
      const maxN = existing.reduce((m, r) => { const n = r.name.match(/(\d+)$/); return n ? Math.max(m, +n[1]) : m; }, 0);
      const adds = Array.from({ length: delta }, (_, i) => ({ id: makeId(), name: `${rt.prefix} ${maxN + i + 1}`, type: rt.id, zone: rt.zone }));
      setRooms(prev => [...prev, ...adds]);
    } else {
      let removed = 0;
      setRooms(prev => [...prev].reverse().filter(r => {
        if (r.type === rt.id && removed < Math.abs(delta)) { removed++; return false; }
        return true;
      }).reverse());
    }
  };

  const editRoom   = (id: string, changes: Partial<Room>) => setRooms(prev => prev.map(r => r.id === id ? { ...r, ...changes } : r));
  const deleteRoom = (id: string) => {
    const room = rooms.find(r => r.id === id);
    if (room) setCounts(prev => ({ ...prev, [room.type]: Math.max(0, (prev[room.type] ?? 0) - 1) }));
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  const addCustom = () => {
    if (!customLabel.trim()) return;
    const label = customLabel.trim().slice(0, 50);
    const newRooms = Array.from({ length: customCount }, (_, i) => ({ id: makeId(), name: `${label} ${i + 1}`, type: 'custom' as RoomType, zone: 'utility' as ZoneType, customType: label }));
    setRooms(prev => [...prev, ...newRooms]);
    setCustomLabel(''); setCustomCount(1);
  };

  const handleContinue = async () => {
    if (rooms.length === 0) { toast({ title: 'Add at least one room before continuing', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = rooms.map(({ name, type, zone, customType }) => ({ name: name.slice(0, 100), type, zone, ...(customType ? { customType } : {}) }));
      const res = await fetch(`/api/onboarding/sessions/${sessionId}/rooms`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rooms: payload }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `Save failed (${res.status})`); }
      onComplete(rooms);
    } catch (err: any) {
      toast({ title: 'Could not save rooms', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const uniqueZones = new Set(rooms.map(r => r.zone)).size;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Step 5 — Set Up Your Rooms</CardTitle>
        <CardDescription>Tell us about your practice layout. We'll use this to create your cleaning schedule. You can add, remove, or rename rooms anytime.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Room type counters table */}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 border-b"><th className="text-left px-3 py-2 font-semibold text-muted-foreground">Room Type</th><th className="text-center px-3 py-2 font-semibold text-muted-foreground w-32">How Many?</th></tr></thead>
            <tbody>
              {ROOM_TYPES.map((rt, i) => (
                <tr key={rt.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="px-3 py-2.5">{rt.label}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" onClick={() => onCountChange(rt, -1)} disabled={(counts[rt.id] ?? 0) === 0} className="w-7 h-7 rounded border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"><Minus className="h-3 w-3" /></button>
                      <span className="w-5 text-center font-semibold">{counts[rt.id] ?? 0}</span>
                      <button type="button" onClick={() => onCountChange(rt, 1)} disabled={(counts[rt.id] ?? 0) === 20} className="w-7 h-7 rounded border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"><Plus className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Custom room type entry */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Custom Room Type</p>
          <div className="flex gap-2">
            <Input placeholder="e.g. Treatment Room" value={customLabel} onChange={e => setCustomLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustom()} maxLength={50} className="flex-1" />
            <div className="flex items-center gap-1 flex-shrink-0">
              <button type="button" onClick={() => setCustomCount(c => Math.max(1, c - 1))} className="w-7 h-7 rounded border flex items-center justify-center hover:bg-muted"><Minus className="h-3 w-3" /></button>
              <span className="w-5 text-center text-sm font-semibold">{customCount}</span>
              <button type="button" onClick={() => setCustomCount(c => Math.min(20, c + 1))} className="w-7 h-7 rounded border flex items-center justify-center hover:bg-muted"><Plus className="h-3 w-3" /></button>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCustom} disabled={!customLabel.trim()} className="flex-shrink-0"><PlusCircle className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </div>

        {/* Generated + editable room list */}
        {rooms.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Your Rooms ({rooms.length} total)</p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
              {rooms.map(room => <Step5RoomRow key={room.id} room={room} onEdit={editRoom} onDelete={deleteRoom} />)}
            </div>
            <Button type="button" variant="ghost" size="sm" className="text-xs h-8" onClick={() => setRooms(prev => [...prev, { id: makeId(), name: 'New Room', type: 'custom', zone: 'utility' }])}>
              <PlusCircle className="h-3.5 w-3.5 mr-1" />Add Room
            </Button>
          </div>
        )}

        {/* Summary */}
        {rooms.length > 0 && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-center text-primary/80">
            <strong>{rooms.length}</strong> room{rooms.length !== 1 ? 's' : ''} across <strong>{uniqueZones}</strong> zone{uniqueZones !== 1 ? 's' : ''} — ready for cleaning schedule setup
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
          <Button onClick={handleContinue} disabled={saving || rooms.length === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Continue<ChevronRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
