import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface TrainingCatalogueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  trainingType?: any;
}

const RENEWALS = ['annual', 'biennial', 'triennial', 'five_yearly'];

export function TrainingCatalogueDialog({ open, onOpenChange, onSuccess, trainingType }: TrainingCatalogueDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: trainingType?.name ?? '',
    description: trainingType?.description ?? '',
    renewalFrequency: trainingType?.renewalFrequency ?? trainingType?.renewal_frequency ?? 'none',
  });

  const handleSubmit = async () => {
    if (!user?.practiceId) return;
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setLoading(true);
    try {
      const isEdit = !!trainingType?.id;
      const url = isEdit
        ? `/api/practices/${user.practiceId}/training-types/${trainingType.id}`
        : `/api/practices/${user.practiceId}/training-types`;
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description || null,
          renewalFrequency: form.renewalFrequency === 'none' ? null : form.renewalFrequency,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }
      toast.success(`Training type ${isEdit ? 'updated' : 'created'}`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save training type');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>{trainingType ? 'Edit' : 'Add'} Training Type</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tt-name">Name *</Label>
            <Input id="tt-name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Basic Life Support" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tt-desc">Description</Label>
            <Textarea id="tt-desc" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Renewal frequency</Label>
            <Select value={form.renewalFrequency} onValueChange={(v) => setForm({ ...form, renewalFrequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">One-off (no renewal)</SelectItem>
                {RENEWALS.map((r) => (<SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, ' ')}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim() || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {trainingType ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
