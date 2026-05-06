// ── Module Settings page ──────────────────────────────────────────────────────
// Practice Manager only. Shows all 9 modules with toggle switches.
// Disabling a module preserves historical data and shows a confirmation dialog.
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ClipboardCheck, Flame, ShieldCheck, GraduationCap, FileText, MessageSquare, Sparkles, Users, Thermometer } from 'lucide-react';
import { usePracticeModules, toggleModule } from '@/hooks/usePracticeModules';

// ── Module metadata (mirrors Step2Modules.tsx) ────────────────────────────────
const MODULE_DEFS = [
  { id: 'compliance',   name: 'Compliance & Audits', description: 'Mandatory compliance tasks and audit readiness tracking',     icon: ClipboardCheck },
  { id: 'fire_safety',  name: 'Fire Safety',          description: 'Fire alarm tests, extinguisher checks, risk assessments',    icon: Flame },
  { id: 'ipc',          name: 'IPC',                  description: 'Infection prevention audits, hand hygiene, sharps management',icon: ShieldCheck },
  { id: 'hr_training',  name: 'Training',             description: 'Staff mandatory training tracking and renewal reminders',    icon: GraduationCap },
  { id: 'policies',     name: 'Policies',             description: 'Policy review cycles and staff acknowledgement tracking',    icon: FileText },
  { id: 'complaints',   name: 'Complaints',           description: 'Patient complaint handling, SLA tracking, theme analysis',   icon: MessageSquare },
  { id: 'cleaning',     name: 'Cleaning',             description: 'Daily cleaning schedules, zone management, photo evidence',  icon: Sparkles },
  { id: 'hr',           name: 'HR',                   description: 'Staff records, appraisals, DBS checks, right to work',      icon: Users },
  { id: 'fridge_temps', name: 'Fridge Management',    description: 'Vaccine fridge temperature monitoring and alerts',           icon: Thermometer },
] as const;

export default function ModuleSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { modules, enabledSet, isLoading, practiceId } = usePracticeModules();

  // Dialog state for disable confirmation
  const [pending, setPending]   = useState<{ id: string; name: string } | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggle = async (moduleId: string, moduleName: string, currentlyEnabled: boolean) => {
    if (!practiceId) return;
    // Disabling: show confirmation first
    if (currentlyEnabled) { setPending({ id: moduleId, name: moduleName }); return; }
    // Enabling: apply immediately
    await applyToggle(moduleId, true);
  };

  const applyToggle = async (moduleId: string, isEnabled: boolean) => {
    if (!practiceId) return;
    setToggling(moduleId);
    try {
      await toggleModule(practiceId, moduleId, isEnabled);
      await qc.invalidateQueries({ queryKey: ['practice-modules', practiceId] });
      toast({
        title: isEnabled ? `${MODULE_DEFS.find(m => m.id === moduleId)?.name} enabled` : `${MODULE_DEFS.find(m => m.id === moduleId)?.name} disabled`,
        description: isEnabled ? 'Module is now active on your dashboard.' : 'Module hidden. Your data is preserved.',
      });
    } catch (err: any) {
      toast({ title: 'Could not update module', description: err.message, variant: 'destructive' });
    } finally {
      setToggling(null);
      setPending(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading modules…</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Modules</h1>
        <p className="text-sm text-muted-foreground">
          Enable or disable modules for your practice. Disabled modules are hidden from the dashboard
          but your data is always preserved and can be restored instantly.
        </p>
      </div>

      <div className="rounded-lg border overflow-hidden">
        {MODULE_DEFS.map((mod, i) => {
          const Icon    = mod.icon;
          const enabled = enabledSet.has(mod.id);
          const busy    = toggling === mod.id;
          const dbMod   = modules.find(m => m.moduleName === mod.id);

          return (
            <div key={mod.id} className={`flex items-center gap-4 px-4 py-4 ${i > 0 ? 'border-t' : ''} ${enabled ? 'bg-background' : 'bg-muted/30'}`}>
              <div className={`p-2 rounded-lg flex-shrink-0 ${enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>{mod.name}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
                {!enabled && dbMod?.disabledAt && (
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Disabled {new Date(dbMod.disabledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                {busy ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => handleToggle(mod.id, mod.name, enabled)}
                    aria-label={`Toggle ${mod.name}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disable confirmation dialog */}
      <AlertDialog open={!!pending} onOpenChange={open => { if (!open) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {pending?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Turning off <strong>{pending?.name}</strong> will hide it from your dashboard and compliance
              calculations. Your historical data is fully preserved and will be restored instantly if you
              re-enable it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => pending && applyToggle(pending.id, false)}
            >
              Disable Module
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
