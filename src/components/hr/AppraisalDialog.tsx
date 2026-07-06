import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface AppraisalDialogProps {
  employeeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  existing?: any;
}

function plusOneYear(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function AppraisalDialog({ employeeId, open, onOpenChange, onSuccess, existing }: AppraisalDialogProps) {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    appraisalDate: existing?.appraisal_date ?? existing?.appraisalDate ?? today,
    nextDue: existing?.next_due ?? existing?.nextDue ?? plusOneYear(today),
    summary: existing?.summary ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.appraisalDate) { toast.error('Appraisal date is required'); return; }
    setSaving(true);
    try {
      const isEdit = !!existing?.id;
      const url = isEdit
        ? `/api/practices/${user!.practiceId}/appraisals/${existing.id}`
        : `/api/practices/${user!.practiceId}/appraisals`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          appraisalDate: form.appraisalDate,
          nextDue: form.nextDue || null,
          summary: form.summary || null,
          appraiserId: user?.id ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to save appraisal (${res.status})`);
      }
      toast.success(`Appraisal ${isEdit ? 'updated' : 'recorded'}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save appraisal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit' : 'Record'} Appraisal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appraisal-date">Appraisal Date</Label>
              <Input id="appraisal-date" type="date" value={form.appraisalDate}
                onChange={(e) => setForm({ ...form, appraisalDate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next-due">Next Due</Label>
              <Input id="next-due" type="date" value={form.nextDue}
                onChange={(e) => setForm({ ...form, nextDue: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Summary / Notes</Label>
            <Textarea id="summary" rows={5} value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Outcome, achievements, development needs..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Appraisal'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
