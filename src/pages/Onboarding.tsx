import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search, Loader2, AlertCircle, CheckCircle2, Building2,
  ChevronRight, MapPin, Calendar, ShieldCheck, Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface CqcRating {
  overall: string | null;
  safe: string | null;
  effective: string | null;
  caring: string | null;
  responsive: string | null;
  wellLed: string | null;
}

interface PracticeLookupResult {
  locationId: string;
  name: string;
  address: string;
  postcode: string;
  lastInspectionDate: string | null;
  registrationStatus: string;
  rating: CqcRating;
  providerName: string | null;
}

interface Step1Form {
  regulator: 'cqc' | 'hiw';
  registrationNumber: string;
  practiceName: string;
  address: string;
  postcode: string;
  contactName: string;
  contactEmail: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const RATING_COLOUR: Record<string, string> = {
  Outstanding:     'bg-green-100 text-green-800 border-green-300',
  Good:            'bg-blue-100 text-blue-800 border-blue-300',
  'Requires Improvement': 'bg-amber-100 text-amber-800 border-amber-300',
  Inadequate:      'bg-red-100 text-red-800 border-red-300',
};

const ratingBadge = (rating: string | null) => {
  if (!rating) return 'bg-muted text-muted-foreground border-border';
  return RATING_COLOUR[rating] ?? 'bg-muted text-muted-foreground border-border';
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not available';

const TOTAL_STEPS = 5;

// ── Component ─────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Step 1 state
  const [form, setForm] = useState<Step1Form>({
    regulator: 'cqc',
    registrationNumber: '',
    practiceName: '',
    address: '',
    postcode: '',
    contactName: '',
    contactEmail: '',
  });
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<PracticeLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof Step1Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  // ── Practice Lookup ────────────────────────────────────────────────────────
  const handleLookup = async () => {
    if (!form.registrationNumber.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    setManualEntry(false);

    try {
      const res = await fetch('/api/onboarding/lookup-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber: form.registrationNumber.trim(), regulator: form.regulator }),
      });

      const data = await res.json();

      if (data.manualEntryRequired) {
        setLookupError(data.message ?? data.error ?? 'Practice not found. Please enter details manually.');
        setManualEntry(true);
        return;
      }

      if (data.found && data.practice) {
        const p: PracticeLookupResult = data.practice;
        setLookupResult(p);
        setForm(prev => ({
          ...prev,
          practiceName: p.name,
          address: p.address,
          postcode: p.postcode,
        }));
      }
    } catch {
      setLookupError('Could not connect to the lookup service. Please enter your details manually.');
      setManualEntry(true);
    } finally {
      setLookupLoading(false);
    }
  };

  // ── Save and continue ──────────────────────────────────────────────────────
  const handleContinue = async () => {
    if (!form.practiceName.trim()) {
      toast({ title: 'Practice name is required', variant: 'destructive' });
      return;
    }
    if (!form.contactName.trim() || !form.contactEmail.trim()) {
      toast({ title: 'Contact name and email are required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const inspectionData = lookupResult
        ? {
            lastInspectionDate: lookupResult.lastInspectionDate,
            rating: lookupResult.rating,
            registrationStatus: lookupResult.registrationStatus,
            fetchedAt: new Date().toISOString(),
          }
        : undefined;

      let url = '/api/onboarding/sessions';
      let method = 'POST';
      let body: Record<string, any> = {
        practiceName:       form.practiceName,
        registrationNumber: form.registrationNumber || undefined,
        regulator:          form.regulator,
        address:            form.address || undefined,
        postcode:           form.postcode || undefined,
        contactName:        form.contactName,
        contactEmail:       form.contactEmail,
        inspectionData,
      };

      // If we already have a session, update it instead
      if (sessionId) {
        url = `/api/onboarding/sessions/${sessionId}`;
        method = 'PUT';
        body = { ...body, currentStep: 2 };
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `Failed to save (${res.status})`);
      }

      const data = await res.json();
      const newSessionId = data.sessionId ?? sessionId;
      if (newSessionId) setSessionId(newSessionId);

      toast({ title: 'Progress saved', description: 'Moving to Step 2…' });
      // TODO: advance to step 2 when implemented
      // For now, show a placeholder
      toast({ title: 'Step 1 complete', description: 'Onboarding wizard step 2 coming soon.' });
    } catch (err: any) {
      toast({ title: 'Could not save progress', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">FitForAudit</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set Up Your Practice</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Get your GP surgery audit-ready in minutes. We'll pull your CQC registration details
            and configure your compliance modules automatically.
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{Math.round((step / TOTAL_STEPS) * 100)}% complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-1 pt-0.5">
            {['Practice', 'Modules', 'Rooms', 'Staff', 'Review'].map((label, i) => (
              <span key={label} className={i + 1 <= step ? 'text-primary font-medium' : ''}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Step 1 Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-primary" />
              Step 1 — Practice Details
            </CardTitle>
            <CardDescription>
              Enter your regulator and registration number to auto-fill your practice details,
              or enter them manually.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* Regulator selector */}
            <div className="space-y-2">
              <Label>Regulator</Label>
              <div className="flex gap-3">
                {(['cqc', 'hiw'] as const).map(reg => (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, regulator: reg }));
                      setLookupResult(null);
                      setLookupError(null);
                      setManualEntry(reg === 'hiw');
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
                      form.regulator === reg
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {reg === 'cqc' ? 'CQC (England)' : 'HIW (Wales)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Registration number lookup */}
            <div className="space-y-2">
              <Label htmlFor="regNum">
                {form.regulator === 'cqc' ? 'CQC Location / Provider ID' : 'HIW Registration Number'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="regNum"
                  placeholder={form.regulator === 'cqc' ? 'e.g. 1-12345678' : 'e.g. W12345'}
                  value={form.registrationNumber}
                  onChange={set('registrationNumber')}
                  onKeyDown={e => e.key === 'Enter' && handleLookup()}
                  disabled={form.regulator === 'hiw'}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLookup}
                  disabled={!form.registrationNumber.trim() || lookupLoading || form.regulator === 'hiw'}
                  className="shrink-0"
                >
                  {lookupLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Search className="h-4 w-4" />}
                  <span className="ml-1.5 hidden sm:inline">Look Up</span>
                </Button>
              </div>
              {form.regulator === 'hiw' && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 flex-shrink-0" />
                  Health Inspectorate Wales does not provide a public API. Please enter your details below.
                </p>
              )}
            </div>

            {/* Lookup error */}
            {lookupError && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Practice not found automatically</p>
                  <p className="text-xs mt-0.5">{lookupError}</p>
                </div>
              </div>
            )}

            {/* CQC lookup success — confirmed details */}
            {lookupResult && !lookupError && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  Practice found on CQC register
                </div>

                {/* Rating badges */}
                {lookupResult.rating.overall && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CQC Ratings</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(lookupResult.rating)
                        .filter(([, v]) => v)
                        .map(([key, val]) => (
                          <span
                            key={key}
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ratingBadge(val)}`}
                          >
                            {key === 'wellLed' ? 'Well-led' : key.charAt(0).toUpperCase() + key.slice(1)}: {val}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {/* Last inspection */}
                {lookupResult.lastInspectionDate && (
                  <div className="flex items-center gap-1.5 text-xs text-green-700">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    Last inspected: {formatDate(lookupResult.lastInspectionDate)}
                  </div>
                )}
              </div>
            )}

            {/* Practice name — read-only if confirmed, editable if manual */}
            <div className="space-y-2">
              <Label htmlFor="practiceName">Practice Name *</Label>
              <Input
                id="practiceName"
                placeholder="e.g. Riverside Medical Centre"
                value={form.practiceName}
                onChange={set('practiceName')}
                readOnly={!!lookupResult && !manualEntry}
                className={lookupResult && !manualEntry ? 'bg-muted cursor-default' : ''}
              />
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="e.g. 42 High Street, Cardiff"
                  value={form.address}
                  onChange={set('address')}
                  readOnly={!!lookupResult && !manualEntry}
                  className={lookupResult && !manualEntry ? 'bg-muted cursor-default' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  placeholder="e.g. CF10 1AB"
                  value={form.postcode}
                  onChange={set('postcode')}
                  readOnly={!!lookupResult && !manualEntry}
                  className={lookupResult && !manualEntry ? 'bg-muted cursor-default' : ''}
                />
              </div>
            </div>

            {/* Override link */}
            {lookupResult && !manualEntry && (
              <button
                type="button"
                className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                onClick={() => setManualEntry(true)}
              >
                Details incorrect? Edit manually
              </button>
            )}

            {/* Divider */}
            <div className="border-t pt-2" />

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  placeholder="e.g. Sarah Jones"
                  value={form.contactName}
                  onChange={set('contactName')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="e.g. manager@riverside.nhs.uk"
                  value={form.contactEmail}
                  onChange={set('contactEmail')}
                />
              </div>
            </div>

            {/* Continue */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/login')}
              >
                ← Back to login
              </button>
              <Button
                onClick={handleContinue}
                disabled={saving || !form.practiceName.trim() || !form.contactName.trim() || !form.contactEmail.trim()}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Continue
                <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>

          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Your data is stored securely and never shared. By continuing you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}
