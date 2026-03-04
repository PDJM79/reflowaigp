import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  ClipboardCheck, Flame, ShieldCheck, GraduationCap, FileText,
  MessageSquare, Sparkles, Users, Thermometer, Loader2, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ModuleSelections } from './types';

// ── Module definitions ────────────────────────────────────────────────────────
// Defined as a constant (not inline JSX) so it's easy to extend and test.
interface ModuleDef {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
}

const MODULE_DEFS: ModuleDef[] = [
  { id: 'compliance',   name: 'Compliance & Audits', description: 'Track mandatory compliance tasks and audit readiness',              icon: ClipboardCheck },
  { id: 'fire_safety',  name: 'Fire Safety',          description: 'Fire alarm tests, extinguisher checks, risk assessments and drills', icon: Flame },
  { id: 'ipc',          name: 'IPC',                  description: 'Infection prevention audits, hand hygiene, sharps management',       icon: ShieldCheck },
  { id: 'hr_training',  name: 'Training',             description: 'Staff mandatory training tracking and renewal reminders',            icon: GraduationCap },
  { id: 'policies',     name: 'Policies',             description: 'Policy review cycles and staff acknowledgement tracking',            icon: FileText },
  { id: 'complaints',   name: 'Complaints',           description: 'Patient complaint handling, SLA tracking, theme analysis',          icon: MessageSquare },
  { id: 'cleaning',     name: 'Cleaning',             description: 'Daily cleaning schedules, zone management, photo evidence',         icon: Sparkles },
  { id: 'hr',           name: 'HR',                   description: 'Staff records, appraisals, DBS checks, right to work',             icon: Users },
  { id: 'fridge_temps', name: 'Fridge Management',   description: 'Vaccine fridge temperature monitoring and alerts',                  icon: Thermometer },
];

// All modules are ON by default
const defaultModules = (): ModuleSelections =>
  Object.fromEntries(MODULE_DEFS.map(m => [m.id, true]));

interface Props {
  sessionId: string;
  onBack: () => void;
  onComplete: (modules: ModuleSelections) => void;
}

export function Step2Modules({ sessionId, onBack, onComplete }: Props) {
  const { toast } = useToast();
  const [modules, setModules] = useState<ModuleSelections>(defaultModules);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setModules(prev => ({ ...prev, [id]: !prev[id] }));

  const handleContinue = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/onboarding/sessions/${sessionId}/modules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Failed to save (${res.status})`);
      }
      onComplete(modules);
    } catch (err: any) {
      toast({ title: 'Could not save modules', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = Object.values(modules).filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Step 2 — Choose Your Modules</CardTitle>
        <CardDescription>
          Which areas would you like FitForAudit to manage? All modules are included in your
          subscription. Toggle off any areas you already manage with other systems.
          <span className="block mt-1 text-xs">You can change this anytime in Settings.</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MODULE_DEFS.map(mod => {
            const Icon = mod.icon;
            const on = modules[mod.id] ?? true;
            return (
              <div
                key={mod.id}
                onClick={() => toggle(mod.id)}
                className={`relative rounded-lg border p-4 cursor-pointer transition-all select-none ${
                  on
                    ? 'bg-background border-primary/30 shadow-sm hover:border-primary/60'
                    : 'bg-muted/40 border-border opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-1.5 rounded-md flex-shrink-0 ${on ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${on ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {mod.name}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                  {/* Prevent the click handler from firing twice on the switch */}
                  <div onClick={e => e.stopPropagation()} className="flex-shrink-0 pt-0.5">
                    <Switch
                      checked={on}
                      onCheckedChange={() => toggle(mod.id)}
                      aria-label={`Toggle ${mod.name}`}
                    />
                  </div>
                </div>
                {!on && (
                  <p className="mt-2 text-xs text-muted-foreground/80 italic">
                    You can enable this later in Settings
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {enabledCount} of {MODULE_DEFS.length} modules enabled
          {!modules['cleaning'] && ' · Cleaning off — room setup steps will be skipped'}
        </p>

        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" onClick={onBack} className="text-sm">
            <ChevronLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <Button onClick={handleContinue} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Continue<ChevronRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
