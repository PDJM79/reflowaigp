import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface ScriptRemovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  script: any;
}

const REMOVAL_REASONS = [
  { value: 'vaccine', label: 'Vaccine (not claimable)' },
  { value: 'duplicate', label: 'Duplicate entry' },
  { value: 'error', label: 'Data entry error' },
  { value: 'patient_cancelled', label: 'Patient cancelled' },
  { value: 'prescription_error', label: 'Prescription error' },
  { value: 'other', label: 'Other (specify in notes)' },
];

export function ScriptRemovalDialog({ isOpen, onClose, onSuccess, script }: ScriptRemovalDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [removalReason, setRemovalReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleRemove = async () => {
    if (!removalReason) {
      toast.error('Please select a removal reason');
      return;
    }

    toast.info('Script removal will be available soon. This feature is being migrated.');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Remove Script
          </DialogTitle>
          <DialogDescription>
            Mark this script as removed. This will exclude it from claims but maintain the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <p className="font-medium text-sm">{script?.drug_name || script?.drugName}</p>
            <p className="text-xs text-muted-foreground">
              {script?.drug_code || script?.drugCode} • {script?.prescriber} • Qty: {script?.quantity}
            </p>
            <p className="text-xs text-muted-foreground">
              Issued: {script?.issue_date || script?.issueDate ? new Date(script.issue_date || script.issueDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Removal Reason *</Label>
            <Select value={removalReason} onValueChange={setRemovalReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REMOVAL_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide additional context (optional)"
              rows={3}
            />
          </div>

          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>Note:</strong> This action maintains the full audit trail. The script will be
              excluded from claim submissions but remains visible in the removed scripts view.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRemove} disabled={loading}>
            {loading ? 'Removing...' : 'Remove Script'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
