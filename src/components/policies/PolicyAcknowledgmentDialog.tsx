import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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

  // Track policy view when dialog opens
  const trackPolicyView = async () => {
    if (!policy || !user) return;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) return;

      await (supabase as any)
        .from('policy_views')
        .insert({
          policy_id: policy.id,
          user_id: userData.id,
          version: policy.version || 'unversioned',
        });
    } catch (error) {
      console.error('Error tracking policy view:', error);
    }
  };

  const handleAcknowledge = async () => {
    if (!acknowledged) {
      toast.error('Please confirm you have read and understood this policy');
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User not found');

      // Record acknowledgment
      const { error } = await supabase
        .from('policy_acknowledgments')
        .insert([{
          policy_id: policy.id,
          user_id: userData.id,
          practice_id: userData.practice_id,
          version_acknowledged: policy.version || 'unversioned',
          ip_address: null, // Could be captured via API
          user_agent: navigator.userAgent,
        }]);

      if (error) throw error;

      toast.success('Policy acknowledged successfully');
      onSuccess();
      onClose();
      setAcknowledged(false);
    } catch (error: any) {
      console.error('Error acknowledging policy:', error);
      if (error?.code === '23505') {
        toast.error('You have already acknowledged this version of the policy');
      } else {
        toast.error('Failed to record acknowledgment');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async () => {
    if (!policy.storage_path) {
      toast.error('Document file not available');
      return;
    }

    // Track policy view
    await trackPolicyView();

    try {
      const { data, error } = await supabase.storage
        .from('policy-documents')
        .createSignedUrl(policy.storage_path, 3600); // 1 hour

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to open document');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Acknowledge Policy
          </DialogTitle>
          <DialogDescription>
            Please read the policy document before acknowledging
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg space-y-2">
            <h3 className="font-semibold text-lg">{policy.title}</h3>
            {policy.version && (
              <p className="text-sm text-muted-foreground">Version: {policy.version}</p>
            )}
            {policy.effective_from && (
              <p className="text-sm text-muted-foreground">
                Effective from: {new Date(policy.effective_from).toLocaleDateString()}
              </p>
            )}
            {policy.review_due && (
              <p className="text-sm text-muted-foreground">
                Next review: {new Date(policy.review_due).toLocaleDateString()}
              </p>
            )}
          </div>

          {policy.storage_path && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
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
                Your acknowledgment will be recorded with a timestamp for audit purposes
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAcknowledge} disabled={loading || !acknowledged}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {loading ? 'Recording...' : 'Acknowledge Policy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
