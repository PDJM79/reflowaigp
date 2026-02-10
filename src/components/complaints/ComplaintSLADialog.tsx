import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ComplaintSLADialogProps {
  open: boolean;
  onClose: () => void;
  complaint: any;
  actionType: 'acknowledgment' | 'final_response';
}

export const ComplaintSLADialog = ({ open, onClose, complaint, actionType }: ComplaintSLADialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState('');

  const sendResponseMutation = useMutation({
    mutationFn: async (data: { notes: string }) => {
      if (!user?.practiceId) throw new Error('Practice not found');

      const updateData: any = {};
      
      if (actionType === 'acknowledgment') {
        updateData.acknowledgmentSentAt = new Date().toISOString();
        updateData.acknowledgmentSentBy = user.id;
        updateData.acknowledgmentNotes = data.notes;
      } else {
        updateData.finalResponseSentAt = new Date().toISOString();
        updateData.finalResponseSentBy = user.id;
        updateData.resolutionNotes = data.notes;
      }

      const response = await fetch(`/api/practices/${user.practiceId}/complaints/${complaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to send response' }));
        throw new Error(err.error || 'Failed to send response');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `${actionType === 'acknowledgment' ? 'Acknowledgment' : 'Final response'} sent successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints-analytics'] });
      onClose();
      setNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendResponseMutation.mutate({ notes });
  };

  const getSLAStatus = () => {
    const dueDate = actionType === 'acknowledgment' 
      ? complaint.acknowledgment_due_date || complaint.acknowledgmentDueDate
      : complaint.final_response_due_date || complaint.finalResponseDueDate;
    
    const today = new Date();
    const due = new Date(dueDate);
    const daysRemaining = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return { icon: AlertCircle, color: 'text-destructive', text: `${Math.abs(daysRemaining)} days overdue`, variant: 'destructive' as const };
    } else if (daysRemaining <= 2) {
      return { icon: Clock, color: 'text-warning', text: `${daysRemaining} days remaining`, variant: 'default' as const };
    } else {
      return { icon: CheckCircle, color: 'text-success', text: `${daysRemaining} days remaining`, variant: 'secondary' as const };
    }
  };

  const slaStatus = getSLAStatus();
  const StatusIcon = slaStatus.icon;

  const acknowledgmentDueDate = complaint.acknowledgment_due_date || complaint.acknowledgmentDueDate;
  const finalResponseDueDate = complaint.final_response_due_date || complaint.finalResponseDueDate;
  const complainantName = complaint.complainant_name || complaint.complainantName;
  const receivedDate = complaint.received_date || complaint.receivedDate;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {actionType === 'acknowledgment' ? 'Send Acknowledgment Letter' : 'Send Final Response'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm sm:text-base">
              <div>
                <p className="font-medium">Complainant</p>
                <p className="text-muted-foreground">{complainantName}</p>
              </div>
              <div>
                <p className="font-medium">Received</p>
                <p className="text-muted-foreground">{new Date(receivedDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-medium">Category</p>
                <p className="text-muted-foreground capitalize">{complaint.category?.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="font-medium">Due Date</p>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground">
                    {new Date(
                      actionType === 'acknowledgment' 
                        ? acknowledgmentDueDate
                        : finalResponseDueDate
                    ).toLocaleDateString()}
                  </p>
                  <Badge variant={slaStatus.variant} className="flex items-center gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {slaStatus.text}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base">
                {actionType === 'acknowledgment' ? 'Acknowledgment Letter Content' : 'Final Response'}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={8}
                required
                placeholder={
                  actionType === 'acknowledgment'
                    ? 'Enter the acknowledgment letter content to be sent to the complainant...'
                    : 'Enter the final response detailing the investigation findings and resolution...'
                }
                className="min-h-[180px] text-base resize-y"
              />
              <p className="text-xs sm:text-sm text-muted-foreground">
                {actionType === 'acknowledgment' 
                  ? 'This will be sent as a holding letter within 48 hours (2 working days) of receipt'
                  : 'This final response should address all concerns raised and be sent within 30 working days'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={sendResponseMutation.isPending}
                className="w-full sm:w-auto min-h-[44px] order-1 sm:order-2"
              >
                {sendResponseMutation.isPending ? 'Sending...' : `Send ${actionType === 'acknowledgment' ? 'Acknowledgment' : 'Response'}`}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
