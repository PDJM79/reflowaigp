import { useState } from 'react';
import { ChevronDown, ChevronRight, Lock, Star } from 'lucide-react';
import type { ComplianceTemplate } from './types';

const FREQ_COLOUR: Record<string, string> = {
  daily:        'bg-red-100 text-red-700',
  twice_daily:  'bg-red-100 text-red-700',
  weekly:       'bg-orange-100 text-orange-700',
  monthly:      'bg-amber-100 text-amber-700',
  quarterly:    'bg-yellow-100 text-yellow-700',
  six_monthly:  'bg-teal-100 text-teal-700',
  annually:     'bg-blue-100 text-blue-700',
};
const freqLabel = (f: string) => ({ daily: 'Daily', twice_daily: 'Twice Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', six_monthly: '6-Monthly', annually: 'Annual' }[f] ?? f);

interface Props {
  template: ComplianceTemplate;
  isPriority: boolean;
}

// ── Individual compliance task card ───────────────────────────────────────────
// Uses local expand/collapse state so the parent list doesn't re-render on toggle.
export function Step4ComplianceItem({ template, isPriority }: Props) {
  const [expanded, setExpanded] = useState(false);
  const freqCls = FREQ_COLOUR[template.frequency] ?? 'bg-muted text-muted-foreground';

  return (
    <div className={`rounded-lg border ${isPriority ? 'border-amber-300 bg-amber-50/40' : 'bg-background'}`}>
      {/* Header row — click to expand */}
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/30 transition-colors rounded-lg"
        aria-expanded={expanded}
      >
        {/* Expand chevron */}
        <span className="text-muted-foreground flex-shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>

        {/* Task name */}
        <span className="flex-1 text-sm font-medium leading-snug">{template.title}</span>

        {/* Priority badge */}
        {isPriority && (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5 flex-shrink-0">
            <Star className="h-3 w-3" />PRIORITY
          </span>
        )}

        {/* Frequency badge */}
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${freqCls}`}>
          {freqLabel(template.frequency)}
        </span>

        {/* Lock — mandatory, cannot be removed */}
        <span title="This is a mandatory regulatory requirement and cannot be modified" className="text-muted-foreground/60 flex-shrink-0">
          <Lock className="h-3.5 w-3.5" />
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && template.description && (
        <div className="px-4 pb-3 pt-0">
          <div className="border-t pt-2 mt-0">
            <p className="text-xs text-muted-foreground leading-relaxed">{template.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
