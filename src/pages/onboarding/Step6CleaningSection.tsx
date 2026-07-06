import { useState } from 'react';
import { ChevronDown, ChevronRight, Camera } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { TaskConfig, CleaningFrequency } from './types';

export const FREQ_OPTIONS: { value: CleaningFrequency; label: string }[] = [
  { value: '2x_daily',       label: '2× Daily' },
  { value: 'daily',          label: 'Daily' },
  { value: 'every_other_day',label: 'Every Other Day' },
  { value: 'weekly',         label: 'Weekly' },
  { value: 'fortnightly',    label: 'Fortnightly' },
  { value: 'monthly',        label: 'Monthly' },
];

interface Props {
  displayName: string;
  roomCount: number;
  tasks: TaskConfig[];
  isCustomMode: boolean;
  onTaskChange: (templateId: string, changes: Partial<TaskConfig>) => void;
}

// ── Per-room-type collapsible cleaning schedule section ───────────────────────
// Extracted to keep Step6Cleaning.tsx under the 300-line limit.
// Each section shows tasks with frequency dropdown + photo checkbox.
// Dropdowns are disabled in recommended/minimum mode and enabled in custom mode.
export function Step6CleaningSection({ displayName, roomCount, tasks, isCustomMode, onTaskChange }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border overflow-hidden">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-semibold">{displayName}</span>
          <span className="text-xs text-muted-foreground">({roomCount} room{roomCount !== 1 ? 's' : ''})</span>
        </div>
        <span className="text-xs text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
      </button>

      {open && (
        <div className="bg-background">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_140px_40px] gap-2 px-4 py-2 border-b bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Task</span><span>Frequency</span><span className="text-center">Photo</span>
          </div>

          {/* Task rows */}
          {tasks.map(task => (
            <div key={task.templateId} className="grid grid-cols-[1fr_140px_40px] gap-2 items-center px-4 py-2.5 border-b last:border-b-0 hover:bg-muted/10">
              <span className="text-sm leading-snug">{task.taskName}</span>

              <Select
                value={task.frequency}
                onValueChange={v => onTaskChange(task.templateId, { frequency: v as CleaningFrequency })}
                disabled={!isCustomMode}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQ_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Photo required toggle */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => isCustomMode && onTaskChange(task.templateId, { requiresPhoto: !task.requiresPhoto })}
                  className={`p-1.5 rounded transition-colors ${task.requiresPhoto ? 'text-primary bg-primary/10' : 'text-muted-foreground/40'} ${isCustomMode ? 'hover:bg-muted cursor-pointer' : 'cursor-default'}`}
                  title={task.requiresPhoto ? 'Photo required' : 'No photo required'}
                  aria-pressed={task.requiresPhoto}
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <p className="text-xs text-muted-foreground px-4 py-2 border-t italic">
            Based on CQC/HIW best practice guidance. Applies to all {roomCount} room{roomCount !== 1 ? 's' : ''} of this type.
          </p>
        </div>
      )}
    </div>
  );
}
