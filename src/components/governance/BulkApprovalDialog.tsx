import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { PendingApprovalItem, ENTITY_TYPE_LABELS } from './types';
import type { ApprovalDecision } from '@/hooks/useGovernanceNotifications';
import { useGovernanceNotifications } from '@/hooks/useGovernanceNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface BulkApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: PendingApprovalItem[];
  onComplete: () => void;
  practiceId: string;
}

export function BulkApprovalDialog({
  open,
  onOpenChange,
  selectedItems,
  onComplete,
  practiceId,
}: BulkApprovalDialogProps) {
  const { user } = useAuth();
  const { notifyBulkApprovalComplete, loading: notificationLoading } = useGovernanceNotifications();
  
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'pending_changes'>('approved');
  const [notes, setNotes] = useState('');
  const [digitalSignature, setDigitalSignature] = useState('');
  const [reviewerTitle, setReviewerTitle] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!confirmed || !digitalSignature.trim()) return;
    
    setSubmitting(true);
    try {
      // Update all governance_approvals records
      const updates = selectedItems.map(async (item) => {
        // First try to update existing record
        const { data: existing } = await supabase
          .from('governance_approvals')
          .select('id')
          .eq('entity_type', item.entityType)
          .eq('entity_id', item.entityId)
          .eq('decision', 'pending')
          .single();

        if (existing) {
          return supabase
            .from('governance_approvals')
            .update({
              decision,
              approved_by: user?.id,
              approved_at: new Date().toISOString(),
              approval_notes: notes || null,
              digital_signature: digitalSignature,
              reviewer_title: reviewerTitle || null,
            })
            .eq('id', existing.id);
        } else {
          // Create new record if none exists
          return supabase
            .from('governance_approvals')
            .insert({
              practice_id: practiceId,
              entity_type: item.entityType,
              entity_id: item.entityId,
              entity_name: item.entityName,
              decision,
              requested_by: item.requestedBy,
              approved_by: user?.id,
              approved_at: new Date().toISOString(),
              approval_notes: notes || null,
              digital_signature: digitalSignature,
              reviewer_title: reviewerTitle || null,
            });
        }
      });

      await Promise.all(updates);

      // Send notifications to document owners
      const notificationItems = selectedItems.map((item) => ({
        practiceId,
        entityType: item.entityType,
        entityId: item.entityId,
        entityName: item.entityName,
        ownerId: item.ownerId || item.requestedBy || '',
        ownerName: item.ownerName || item.requestedByName || 'Unknown',
      }));

      await notifyBulkApprovalComplete(
        notificationItems,
        decision,
        digitalSignature,
        reviewerTitle || undefined,
        notes || undefined
      );

      toast({
        title: 'Approvals Processed',
        description: `${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''} ${decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'returned for changes'}`,
      });

      onComplete();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error processing approvals:', error);
      toast({
        title: 'Error',
        description: 'Failed to process approvals. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setDecision('approved');
    setNotes('');
    setDigitalSignature('');
    setReviewerTitle('');
    setConfirmed(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Approval</DialogTitle>
          <DialogDescription>
            Review and approve {selectedItems.length} selected item{selectedItems.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected Items */}
          <div>
            <Label className="text-sm font-medium">Selected Items</Label>
            <ScrollArea className="h-32 mt-2 border rounded-md p-2">
              <div className="space-y-2">
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-xs">
                      {ENTITY_TYPE_LABELS[item.entityType]}
                    </Badge>
                    <span className="truncate">{item.entityName}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Decision */}
          <div className="space-y-2">
            <Label>Decision</Label>
            <RadioGroup value={decision} onValueChange={(v) => setDecision(v as ApprovalDecision)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="approved" id="approved" />
                <Label htmlFor="approved" className="flex items-center gap-2 cursor-pointer">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Approve
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pending_changes" id="pending_changes" />
                <Label htmlFor="pending_changes" className="flex items-center gap-2 cursor-pointer">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Request Changes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="rejected" id="rejected" />
                <Label htmlFor="rejected" className="flex items-center gap-2 cursor-pointer">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Reject
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any comments or feedback..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Digital Signature */}
          <div className="space-y-2">
            <Label htmlFor="signature">Digital Signature (type full name) *</Label>
            <Input
              id="signature"
              placeholder="Type your full name to sign"
              value={digitalSignature}
              onChange={(e) => setDigitalSignature(e.target.value)}
            />
          </div>

          {/* Reviewer Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Your Title/Role (optional)</Label>
            <Input
              id="title"
              placeholder="e.g., Practice Manager"
              value={reviewerTitle}
              onChange={(e) => setReviewerTitle(e.target.value)}
            />
          </div>

          {/* Confirmation */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <Label htmlFor="confirm" className="text-sm cursor-pointer">
              I confirm that I have reviewed these items and my decision is accurate. This action will be recorded in the audit trail.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!confirmed || !digitalSignature.trim() || submitting || notificationLoading}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `${decision === 'approved' ? 'Approve' : decision === 'rejected' ? 'Reject' : 'Return'} ${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
