import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronDown, ChevronRight, ChevronLeft, Loader2, AlertCircle, ClipboardCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Step4ComplianceItem } from './Step4ComplianceItem';
import type { ComplianceTemplate, InspectionData, ModuleSelections } from './types';

// ── Category display config ────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  fire_safety:       'Fire Safety',
  legionella:        'Legionella / Water Safety',
  infection_control: 'Infection Prevention & Control',
  training:          'Mandatory Training',
  governance:        'Policies & Governance',
  cold_chain:        'Fridge & Cold Chain',
};

// Map module IDs to the compliance_templates.module_name values used in the DB
const MODULE_TO_DB_NAME: Record<string, string[]> = {
  compliance:   ['water_safety'],   // Legionella always shown when Compliance is on
  fire_safety:  ['fire_safety'],
  ipc:          ['ipc'],
  hr_training:  ['hr_training'],
  policies:     ['policies'],
  fridge_temps: ['fridge_temps'],
};

// Inspect rating keywords that flag tasks as priority (case-insensitive)
const PRIORITY_KEYWORDS = ['infection', 'ipc', 'fire', 'legionella', 'water', 'training', 'safeguard', 'fridge', 'vaccine', 'cleaning'];

function hasPriorityKeyword(inspectionData: InspectionData | null, template: ComplianceTemplate): boolean {
  if (!inspectionData) return false;
  const rating = inspectionData.rating.overall;
  if (!rating || rating === 'Good' || rating === 'Outstanding') return false;
  // Any non-Good rating: flag all tasks as potentially needing attention
  // Refinement: only flag categories matching the key findings text
  const findings = (inspectionData.keyFindings ?? '').toLowerCase();
  return PRIORITY_KEYWORDS.some(kw => template.title.toLowerCase().includes(kw) || template.category.includes(kw) || findings.includes(kw));
}

interface CategorySectionProps {
  label: string;
  templates: ComplianceTemplate[];
  inspectionData: InspectionData | null;
}

function CategorySection({ label, templates, inspectionData }: CategorySectionProps) {
  const [open, setOpen] = useState(true);
  const priorityCount = templates.filter(t => hasPriorityKeyword(inspectionData, t)).length;
  return (
    <div className="rounded-lg border overflow-hidden">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between p-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left">
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-xs text-muted-foreground">({templates.length})</span>
          {priorityCount > 0 && <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5">{priorityCount} priority</span>}
        </div>
      </button>
      {open && (
        <div className="p-3 space-y-2 bg-background">
          {templates.map(t => (
            <Step4ComplianceItem key={t.id} template={t} isPriority={hasPriorityKeyword(inspectionData, t)} />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  sessionId: string;
  modules: ModuleSelections;
  inspectionData: InspectionData | null;
  regulator: 'cqc' | 'hiw';
  onBack: () => void;
  onComplete: () => void;
}

export function Step4Compliance({ sessionId, modules, inspectionData, regulator, onBack, onComplete }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ComplianceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Compute the list of DB module_names to request based on enabled modules
  const enabledDbNames = Object.entries(modules)
    .filter(([, on]) => on)
    .flatMap(([id]) => MODULE_TO_DB_NAME[id] ?? []);

  useEffect(() => {
    if (enabledDbNames.length === 0) { setLoading(false); return; }
    const params = new URLSearchParams({ modules: [...new Set(enabledDbNames)].join(','), regulator });
    fetch(`/api/onboarding/compliance-templates?${params}`)
      .then(r => r.json())
      .then(d => setTemplates(d.templates ?? []))
      .catch(() => toast({ title: 'Could not load compliance templates', variant: 'destructive' }))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group by category
  const byCategory = templates.reduce<Record<string, ComplianceTemplate[]>>((acc, t) => {
    const cat = t.category;
    return { ...acc, [cat]: [...(acc[cat] ?? []), t] };
  }, {});

  const totalCount = templates.length;
  const catCount = Object.keys(byCategory).length;
  const priorityCount = templates.filter(t => hasPriorityKeyword(inspectionData, t)).length;

  const handleContinue = async () => {
    setSaving(true);
    try {
      // Advance step counter — step 4 done, move to 5
      await fetch(`/api/onboarding/sessions/${sessionId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStep: 5 }),
      });
      onComplete();
    } catch (err: any) {
      toast({ title: 'Could not save progress', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />Step 4 — Your Compliance Requirements
        </CardTitle>
        <CardDescription>
          Based on {regulator.toUpperCase()} regulations, these mandatory tasks cannot be modified.
          They will be automatically scheduled in your practice calendar.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Priority callout */}
        {priorityCount > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>Based on your last {regulator.toUpperCase()} inspection, we've highlighted <strong>{priorityCount} priority area{priorityCount !== 1 ? 's' : ''}</strong> below.</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading compliance requirements…</span>
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No compliance templates found for the selected modules. You can add tasks manually after setup.
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(byCategory).map(([cat, items]) => (
              <CategorySection
                key={cat}
                label={CATEGORY_LABELS[cat] ?? cat}
                templates={items}
                inspectionData={inspectionData}
              />
            ))}
          </div>
        )}

        {/* Summary */}
        {totalCount > 0 && !loading && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            You'll have <strong>{totalCount}</strong> recurring compliance task{totalCount !== 1 ? 's' : ''} across <strong>{catCount}</strong> categor{catCount !== 1 ? 'ies' : 'y'}.
            These will be automatically scheduled starting from your go-live date.
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
          <Button onClick={handleContinue} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Continue<ChevronRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
