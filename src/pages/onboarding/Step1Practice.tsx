import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Search, Loader2, AlertCircle, CheckCircle2, Building2,
  ChevronRight, Calendar, Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, toZonedTime } from 'date-fns-tz';
import type { InspectionData, ManagerCredentials, PracticeLookupResult } from './types';

const LONDON = 'Europe/London';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

interface Step1Form {
  regulator: 'cqc' | 'hiw';
  registrationNumber: string;
  practiceName: string;
  address: string;
  postcode: string;
  contactName: string;
  contactEmail: string;
  password: string;
  confirmPassword: string;
}

interface Props {
  onComplete: (sessionId: string, inspection: InspectionData | null, regulator: 'cqc' | 'hiw', credentials: ManagerCredentials) => void;
}

const RATING_COLOUR: Record<string, string> = {
  Outstanding: 'bg-green-100 text-green-800 border-green-300',
  Good: 'bg-blue-100 text-blue-800 border-blue-300',
  'Requires Improvement': 'bg-amber-100 text-amber-800 border-amber-300',
  Inadequate: 'bg-red-100 text-red-800 border-red-300',
};
const ratingBadgeCls = (r: string | null) =>
  r ? (RATING_COLOUR[r] ?? 'bg-muted text-muted-foreground border-border') : 'bg-muted text-muted-foreground border-border';

const formatUKDate = (iso: string) =>
  format(toZonedTime(new Date(iso), LONDON), 'd MMM yyyy', { timeZone: LONDON });

export function Step1Practice({ onComplete }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<Step1Form>({ regulator: 'cqc', registrationNumber: '', practiceName: '', address: '', postcode: '', contactName: '', contactEmail: '', password: '', confirmPassword: '' });
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<PracticeLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [saving, setSaving] = useState(false);

  const setField = (f: keyof Step1Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  const handleLookup = async () => {
    if (!form.registrationNumber.trim()) return;
    setLookupLoading(true); setLookupError(null); setLookupResult(null); setManualEntry(false);
    try {
      const res = await fetch('/api/onboarding/lookup-practice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationNumber: form.registrationNumber.trim(), regulator: form.regulator }),
      });
      const data = await res.json();
      if (data.manualEntryRequired) { setLookupError(data.message ?? data.error ?? 'Practice not found. Please enter details manually.'); setManualEntry(true); return; }
      if (data.found && data.practice) {
        const p: PracticeLookupResult = data.practice;
        setLookupResult(p);
        setForm(prev => ({ ...prev, practiceName: p.name, address: p.address, postcode: p.postcode }));
      }
    } catch { setLookupError('Could not connect to the lookup service. Please enter your details manually.'); setManualEntry(true); }
    finally { setLookupLoading(false); }
  };

  const handleContinue = async () => {
    if (!form.practiceName.trim() || !form.contactName.trim() || !form.contactEmail.trim()) {
      toast({ title: 'Practice name, contact name and email are required', variant: 'destructive' }); return;
    }
    if (!form.password) {
      toast({ title: 'Please create a password', variant: 'destructive' }); return;
    }
    if (!PASSWORD_REGEX.test(form.password)) {
      toast({ title: 'Password must be at least 12 characters and include uppercase, lowercase, a number, and a special character', variant: 'destructive' }); return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      const inspectionData: InspectionData | null = lookupResult
        ? { source: 'cqc', lastInspectionDate: lookupResult.lastInspectionDate, rating: lookupResult.rating, registrationStatus: lookupResult.registrationStatus, fetchedAt: new Date().toISOString() }
        : null;
      const res = await fetch('/api/onboarding/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceName: form.practiceName, registrationNumber: form.registrationNumber || undefined, regulator: form.regulator, address: form.address || undefined, postcode: form.postcode || undefined, contactName: form.contactName, contactEmail: form.contactEmail, inspectionData }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `Failed to save (${res.status})`); }
      const data = await res.json();
      onComplete(data.sessionId, inspectionData, form.regulator, { name: form.contactName, email: form.contactEmail, password: form.password });
    } catch (err: any) { toast({ title: 'Could not save progress', description: err.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const confirmed = !!lookupResult && !manualEntry;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-5 w-5 text-primary" />Step 1 — Practice Details</CardTitle>
        <CardDescription>Enter your regulator and registration number to auto-fill your practice details, or enter them manually.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Regulator */}
        <div className="space-y-2">
          <Label>Regulator</Label>
          <div className="flex gap-3">
            {(['cqc', 'hiw'] as const).map(reg => (
              <button key={reg} type="button" onClick={() => { setForm(p => ({ ...p, regulator: reg })); setLookupResult(null); setLookupError(null); setManualEntry(reg === 'hiw'); }}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${form.regulator === reg ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}>
                {reg === 'cqc' ? 'CQC (England)' : 'HIW (Wales)'}
              </button>
            ))}
          </div>
        </div>
        {/* Lookup */}
        <div className="space-y-2">
          <Label htmlFor="regNum">{form.regulator === 'cqc' ? 'CQC Location / Provider ID' : 'HIW Registration Number'}</Label>
          <div className="flex gap-2">
            <Input id="regNum" placeholder={form.regulator === 'cqc' ? 'e.g. 1-12345678' : 'e.g. W12345'} value={form.registrationNumber} onChange={setField('registrationNumber')} onKeyDown={e => e.key === 'Enter' && handleLookup()} disabled={form.regulator === 'hiw'} />
            <Button type="button" variant="outline" onClick={handleLookup} disabled={!form.registrationNumber.trim() || lookupLoading || form.regulator === 'hiw'} className="shrink-0">
              {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">Look Up</span>
            </Button>
          </div>
          {form.regulator === 'hiw' && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Info className="h-3.5 w-3.5 flex-shrink-0" />Health Inspectorate Wales does not provide a public API. Please enter your details below.</p>}
        </div>
        {lookupError && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div><p className="font-medium">Practice not found automatically</p><p className="text-xs mt-0.5">{lookupError}</p></div>
          </div>
        )}
        {lookupResult && !lookupError && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-medium text-sm"><CheckCircle2 className="h-4 w-4 flex-shrink-0" />Practice found on CQC register</div>
            {lookupResult.rating.overall && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CQC Ratings</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(lookupResult.rating).filter(([, v]) => v).map(([key, val]) => (
                    <span key={key} className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ratingBadgeCls(val)}`}>
                      {key === 'wellLed' ? 'Well-led' : key.charAt(0).toUpperCase() + key.slice(1)}: {val}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {lookupResult.lastInspectionDate && (
              <div className="flex items-center gap-1.5 text-xs text-green-700"><Calendar className="h-3.5 w-3.5 flex-shrink-0" />Last inspected: {formatUKDate(lookupResult.lastInspectionDate)}</div>
            )}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="practiceName">Practice Name *</Label>
          <Input id="practiceName" placeholder="e.g. Riverside Medical Centre" value={form.practiceName} onChange={setField('practiceName')} readOnly={confirmed} className={confirmed ? 'bg-muted cursor-default' : ''} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="e.g. 42 High Street, Cardiff" value={form.address} onChange={setField('address')} readOnly={confirmed} className={confirmed ? 'bg-muted cursor-default' : ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode</Label>
            <Input id="postcode" placeholder="e.g. CF10 1AB" value={form.postcode} onChange={setField('postcode')} readOnly={confirmed} className={confirmed ? 'bg-muted cursor-default' : ''} />
          </div>
        </div>
        {confirmed && <button type="button" className="text-xs text-primary underline underline-offset-2 hover:text-primary/80" onClick={() => setManualEntry(true)}>Details incorrect? Edit manually</button>}
        <div className="border-t pt-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="contactName">Your Name *</Label><Input id="contactName" placeholder="e.g. Sarah Jones" value={form.contactName} onChange={setField('contactName')} /></div>
          <div className="space-y-2"><Label htmlFor="contactEmail">Your Email *</Label><Input id="contactEmail" type="email" placeholder="e.g. manager@surgery.nhs.uk" value={form.contactEmail} onChange={setField('contactEmail')} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input id="password" type="password" placeholder="Min. 12 characters" value={form.password} onChange={setField('password')} />
            <p className="text-xs text-muted-foreground">Must include uppercase, lowercase, number and special character</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input id="confirmPassword" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={setField('confirmPassword')} />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">Step 1 of setup</span>
          <Button onClick={handleContinue} disabled={saving || !form.practiceName.trim() || !form.contactName.trim() || !form.contactEmail.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Continue<ChevronRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
