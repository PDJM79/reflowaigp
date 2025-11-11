import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
      const { data: userData } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .single();

      const updateData: any = {};
      
      if (actionType === 'acknowledgment') {
        updateData.acknowledgment_sent_at = new Date().toISOString();
        updateData.acknowledgment_sent_by = userData?.id;
        updateData.acknowledgment_notes = data.notes;
      } else {
        updateData.final_response_sent_at = new Date().toISOString();
        updateData.final_response_sent_by = userData?.id;
        updateData.resolution_notes = data.notes;
      }

      const { error } = await (supabase as any)
        .from('complaints')
        .update(updateData)
        .eq('id', complaint.id);
      
      if (error) throw error;
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
      ? complaint.acknowledgment_due_date 
      : complaint.final_response_due_date;
    
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {actionType === 'acknowledgment' ? 'Send Acknowledgment Letter' : 'Send Final Response'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Complaint Details */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-medium">Complainant</p>
                <p className="text-muted-foreground">{complaint.complainant_name}</p>
              </div>
              <div>
                <p className="font-medium">Received</p>
                <p className="text-muted-foreground">{new Date(complaint.received_date).toLocaleDateString()}</p>
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
                        ? complaint.acknowledgment_due_date 
                        : complaint.final_response_due_date
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

          {/* Response Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">
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
              />
              <p className="text-sm text-muted-foreground">
                {actionType === 'acknowledgment' 
                  ? 'This will be sent as a holding letter within 48 hours (2 working days) of receipt'
                  : 'This final response should address all concerns raised and be sent within 30 working days'}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={sendResponseMutation.isPending}>
                {sendResponseMutation.isPending ? 'Sending...' : `Send ${actionType === 'acknowledgment' ? 'Acknowledgment' : 'Response'}`}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
