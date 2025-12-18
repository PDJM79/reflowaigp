import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type ApprovableEntityType = 
  | 'policy' 
  | 'fire_safety_assessment' 
  | 'ipc_audit' 
  | 'room_assessment' 
  | 'claim_run';

export type ApprovalDecision = 'approved' | 'rejected' | 'pending_changes';

interface RequestApprovalParams {
  practiceId: string;
  entityType: ApprovableEntityType;
  entityId: string;
  entityName: string;
  requestedById: string;
  requestedByName: string;
  urgency?: 'high' | 'medium' | 'low';
}

interface NotifyApprovalCompleteParams {
  practiceId: string;
  entityType: ApprovableEntityType;
  entityId: string;
  entityName: string;
  decision: ApprovalDecision;
  approverName: string;
  approverTitle?: string;
  notes?: string;
  ownerId: string;
  ownerName: string;
}

export function useGovernanceNotifications() {
  const [loading, setLoading] = useState(false);

  const requestApproval = async (params: RequestApprovalParams): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-governance-approval-emails', {
        body: {
          type: 'request',
          ...params,
        },
      });

      if (error) {
        console.error('Error requesting approval:', error);
        toast({
          title: 'Notification Error',
          description: 'Failed to notify practice managers. The approval request was still recorded.',
          variant: 'destructive',
        });
        return false;
      }

      if (data?.emailsSent > 0 || data?.notificationsCreated > 0) {
        toast({
          title: 'Approval Requested',
          description: `Practice managers have been notified (${data.notificationsCreated} notification${data.notificationsCreated !== 1 ? 's' : ''} sent)`,
        });
      }

      return true;
    } catch (err) {
      console.error('Error in requestApproval:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const notifyApprovalComplete = async (params: NotifyApprovalCompleteParams): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-governance-approval-emails', {
        body: {
          type: 'completed',
          ...params,
        },
      });

      if (error) {
        console.error('Error notifying approval complete:', error);
        // Don't show error toast here as the approval was successful
        // The notification failure is secondary
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in notifyApprovalComplete:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const notifyBulkApprovalComplete = async (
    items: Array<{
      practiceId: string;
      entityType: ApprovableEntityType;
      entityId: string;
      entityName: string;
      ownerId: string;
      ownerName: string;
    }>,
    decision: ApprovalDecision,
    approverName: string,
    approverTitle?: string,
    notes?: string
  ): Promise<{ success: number; failed: number }> => {
    setLoading(true);
    let success = 0;
    let failed = 0;

    try {
      // Send notifications in parallel with a concurrency limit
      const batchSize = 5;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map((item) =>
            notifyApprovalComplete({
              ...item,
              decision,
              approverName,
              approverTitle,
              notes,
            })
          )
        );

        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            success++;
          } else {
            failed++;
          }
        });
      }

      if (success > 0) {
        toast({
          title: 'Notifications Sent',
          description: `${success} owner${success !== 1 ? 's' : ''} notified of approval decision`,
        });
      }

      return { success, failed };
    } catch (err) {
      console.error('Error in notifyBulkApprovalComplete:', err);
      return { success, failed: items.length - success };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    requestApproval,
    notifyApprovalComplete,
    notifyBulkApprovalComplete,
  };
}
