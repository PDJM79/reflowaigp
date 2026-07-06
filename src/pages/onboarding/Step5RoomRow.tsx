import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import type { Room, ZoneType } from './types';

const ZONE_OPTIONS: { value: ZoneType; label: string }[] = [
  { value: 'clinical', label: 'Clinical Zone' },
  { value: 'patient',  label: 'Patient Zone' },
  { value: 'staff',    label: 'Staff Zone' },
  { value: 'utility',  label: 'Utility Zone' },
];

interface Props {
  room: Room;
  onEdit: (id: string, changes: Partial<Room>) => void;
  onDelete: (id: string) => void;
}

// ── Single editable room row ───────────────────────────────────────────────────
// Kept in its own file so Step5Rooms.tsx stays under the 300-line limit.
// Name is capped at 100 chars via maxLength; sanitization is done server-side.
export function Step5RoomRow({ room, onEdit, onDelete }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
      {/* Editable room name */}
      <Input
        value={room.name}
        onChange={e => onEdit(room.id, { name: e.target.value.slice(0, 100) })}
        className="flex-1 h-8 text-sm border-0 shadow-none px-1 focus-visible:ring-1"
        maxLength={100}
        aria-label="Room name"
      />

      {/* Zone selector */}
      <Select
        value={room.zone}
        onValueChange={v => onEdit(room.id, { zone: v as ZoneType })}
      >
        <SelectTrigger className="h-8 w-36 text-xs flex-shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ZONE_OPTIONS.map(opt => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(room.id)}
        className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 p-1"
        aria-label={`Remove ${room.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
