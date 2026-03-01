import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface LogComplaintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  complainantName: '',
  description: '',
  category: 'other',
  severity: 'low',
  channel: 'phone',
};

export function LogComplaintDialog({ open, onOpenChange, onSuccess }: LogComplaintDialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.complainantName.trim()) { toast.error('Complainant name is required'); return; }
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    if (!user?.practiceId) { toast.error('Practice not found'); return; }

    setSaving(true);
    const now = new Date();
    const ackDue = new Date(now); ackDue.setDate(ackDue.getDate() + 2);
    const finalDue = new Date(now); finalDue.setDate(finalDue.getDate() + 30);

    try {
      const res = await fetch(`/api/practices/${user.practiceId}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          complainantName: form.complainantName.trim(),
          description: form.description.trim(),
          category: form.category,
          severity: form.severity,
          channel: form.channel,
          status: 'new',
          slaStatus: 'on_track',
          slaTimescale: 'month',
          receivedAt: now.toISOString(),
          ackDue: ackDue.toISOString(),
          finalDue: finalDue.toISOString(),
          assignedTo: user.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to log complaint');
      }

      toast.success('Complaint logged successfully');
      setForm(EMPTY_FORM);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to log complaint');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Complaint</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="complainant_name">Complainant Name *</Label>
            <Input
              id="complainant_name"
              value={form.complainantName}
              onChange={e => set('complainantName', e.target.value)}
              placeholder="Patient or complainant name"
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the complaint..."
              rows={4}
              className="min-h-[100px] resize-y"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinical_care">Clinical Care</SelectItem>
                  <SelectItem value="staff_attitude">Staff Attitude</SelectItem>
                  <SelectItem value="waiting_times">Waiting Times</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="prescriptions">Prescriptions</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={v => set('severity', v)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={v => set('channel', v)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            ACK due: 2 business days · Final response due: 30 days · Assigned to you
          </p>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log Complaint
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
