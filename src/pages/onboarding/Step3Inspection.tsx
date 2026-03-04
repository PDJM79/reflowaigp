import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CalendarDays, Info, ChevronRight, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, toZonedTime } from 'date-fns-tz';
import type { InspectionData, CqcRating } from './types';

const LONDON = 'Europe/London';

const formatUKDate = (iso: string) =>
  format(toZonedTime(new Date(iso), LONDON), 'd MMM yyyy', { timeZone: LONDON });

const RATING_OPTIONS = ['Outstanding', 'Good', 'Requires Improvement', 'Inadequate', 'Not Yet Inspected'];

const RATING_COLOUR: Record<string, string> = {
  Outstanding: 'bg-green-100 text-green-800 border-green-300',
  Good: 'bg-teal-100 text-teal-800 border-teal-300',
  'Requires Improvement': 'bg-amber-100 text-amber-800 border-amber-300',
  Inadequate: 'bg-red-100 text-red-800 border-red-300',
};
const ratingCls = (r: string | null) =>
  r ? (RATING_COLOUR[r] ?? 'bg-muted text-muted-foreground border-border') : 'bg-muted text-muted-foreground border-border';

const DOMAIN_LABELS: Record<keyof CqcRating, string> = {
  overall: 'Overall', safe: 'Safe', effective: 'Effective',
  caring: 'Caring', responsive: 'Responsive', wellLed: 'Well-Led',
};

interface ManualForm {
  lastInspectionDate: string;
  overallRating: string;
  keyFindings: string;
}

interface Props {
  sessionId: string;
  inspectionData: InspectionData | null;
  regulator: 'cqc' | 'hiw';
  onBack: () => void;
  onComplete: (inspection: InspectionData) => void;
}

export function Step3Inspection({ sessionId, inspectionData, regulator, onBack, onComplete }: Props) {
  const { toast } = useToast();
  const hasCqcData = !!inspectionData && inspectionData.source === 'cqc' && !!inspectionData.lastInspectionDate;
  const [manual, setManual] = useState<ManualForm>({ lastInspectionDate: '', overallRating: '', keyFindings: '' });
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      // Build the final inspection record to persist
      const payload: InspectionData = hasCqcData
        ? inspectionData!
        : {
            source: 'manual',
            lastInspectionDate: manual.lastInspectionDate || null,
            rating: { overall: manual.overallRating || null, safe: null, effective: null, caring: null, responsive: null, wellLed: null },
            keyFindings: manual.keyFindings.slice(0, 2000),  // bound user input
          };

      const res = await fetch(`/api/onboarding/sessions/${sessionId}/inspection`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionData: payload }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Failed to save (${res.status})`);
      }
      onComplete(payload);
    } catch (err: any) {
      toast({ title: 'Could not save inspection data', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Step 3 — Your Inspection History
        </CardTitle>
        <CardDescription>
          {hasCqcData
            ? `We found your last ${regulator.toUpperCase()} inspection details. Review them below.`
            : 'Enter your last inspection details, or skip if you haven\'t been inspected yet.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* CQC data found */}
        {hasCqcData && (
          <>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              {/* Last inspection date */}
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Last Inspection:</span>
                <span className="font-semibold">{formatUKDate(inspectionData!.lastInspectionDate!)}</span>
              </div>

              {/* Overall rating */}
              {inspectionData!.rating.overall && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Overall Rating</p>
                  <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-full border ${ratingCls(inspectionData!.rating.overall)}`}>
                    {inspectionData!.rating.overall}
                  </span>
                </div>
              )}

              {/* Domain ratings */}
              {Object.values(inspectionData!.rating).some(Boolean) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Domain Ratings</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.entries(DOMAIN_LABELS) as [keyof CqcRating, string][])
                      .filter(([key]) => key !== 'overall' && inspectionData!.rating[key])
                      .map(([key, label]) => (
                        <span key={key} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ratingCls(inspectionData!.rating[key])}`}>
                          {label}: {inspectionData!.rating[key]}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Improvement alert for non-Good ratings */}
              {(inspectionData!.rating.overall === 'Requires Improvement' || inspectionData!.rating.overall === 'Inadequate') && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>Your last inspection identified areas requiring improvement. FitForAudit will prioritise these in your compliance tasks.</p>
                </div>
              )}
            </div>

            {/* Informational callout */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>We'll use these findings to prioritise your compliance tasks and provide tailored AI recommendations in Step 7.</p>
            </div>
          </>
        )}

        {/* Manual entry form (HIW or CQC lookup failed) */}
        {!hasCqcData && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lastInspDate">Last Inspection Date</Label>
                <Input id="lastInspDate" type="date" value={manual.lastInspectionDate}
                  onChange={e => setManual(p => ({ ...p, lastInspectionDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overallRating">Overall Rating</Label>
                <Select value={manual.overallRating} onValueChange={v => setManual(p => ({ ...p, overallRating: v }))}>
                  <SelectTrigger id="overallRating"><SelectValue placeholder="Select rating…" /></SelectTrigger>
                  <SelectContent>
                    {RATING_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyFindings">Key Areas for Improvement</Label>
                <Textarea id="keyFindings" placeholder="e.g. Improve IPC documentation, fire risk assessment outstanding…"
                  value={manual.keyFindings} onChange={e => setManual(p => ({ ...p, keyFindings: e.target.value }))}
                  rows={3} maxLength={2000} />
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>Don't worry if you don't have all the details. You can update this later in Settings.</p>
            </div>
          </>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" onClick={onBack}><ChevronLeft className="h-4 w-4 mr-1" />Back</Button>
          {/* "Next" always enabled — this step is informational */}
          <Button onClick={handleContinue} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Continue<ChevronRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
