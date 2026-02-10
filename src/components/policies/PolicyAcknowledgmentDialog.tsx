import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { FileText, CheckCircle } from 'lucide-react';

interface PolicyAcknowledgmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  policy: any;
}

export function PolicyAcknowledgmentDialog({ isOpen, onClose, onSuccess, policy }: PolicyAcknowledgmentDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAcknowledge = async () => {
    if (!acknowledged) {
      toast.error('Please confirm you have read and understood this policy');
      return;
    }

    if (!user?.practiceId) {
      toast.error('Practice not found');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/practices/${user.practiceId}/policies/${policy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          acknowledgedBy: user.id,
          acknowledgedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to record acknowledgement' }));
        throw new Error(err.error || 'Failed to record acknowledgement');
      }

      toast.success('Policy acknowledged successfully');
      onSuccess();
      onClose();
      setAcknowledged(false);
    } catch (error: any) {
      console.error('Error acknowledging policy:', error);
      toast.error(error.message || 'Failed to record acknowledgement');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async () => {
    if (!policy.storagePath && !policy.storage_path) {
      toast.error('Document file not available');
      return;
    }

    toast.info('Document viewing is not yet available through the API');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FileText className="h-5 w-5" />
            Acknowledge Policy
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Please read the policy document before acknowledging
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg space-y-2">
            <h3 className="font-semibold text-lg">{policy.title}</h3>
            {policy.version && (
              <p className="text-sm text-muted-foreground">Version: {policy.version}</p>
            )}
            {(policy.effectiveFrom || policy.effective_from) && (
              <p className="text-sm text-muted-foreground">
                Effective from: {new Date(policy.effectiveFrom || policy.effective_from).toLocaleDateString()}
              </p>
            )}
            {(policy.reviewDue || policy.review_due) && (
              <p className="text-sm text-muted-foreground">
                Next review: {new Date(policy.reviewDue || policy.review_due).toLocaleDateString()}
              </p>
            )}
          </div>

          {(policy.storagePath || policy.storage_path) && (
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-[48px]"
              onClick={handleViewDocument}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Policy Document
            </Button>
          )}

          <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
            />
            <div className="space-y-1 leading-none">
              <label
                htmlFor="acknowledge"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I confirm that I have read and understood this policy
              </label>
              <p className="text-sm text-muted-foreground">
                Your acknowledgement will be recorded with a timestamp for audit purposes
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAcknowledge} 
            disabled={loading || !acknowledged}
            className="w-full sm:w-auto min-h-[44px] order-1 sm:order-2"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {loading ? 'Recording...' : 'Acknowledge Policy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
