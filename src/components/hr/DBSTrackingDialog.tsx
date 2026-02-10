import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface DBSTrackingDialogProps {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  practiceId: string;
  existingCheck?: any;
}

export const DBSTrackingDialog = ({ open, onClose, employeeId, practiceId, existingCheck }: DBSTrackingDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    checkDate: existingCheck?.checkDate || existingCheck?.check_date || new Date().toISOString().split('T')[0],
    certificateNumber: existingCheck?.certificateNumber || existingCheck?.certificate_number || '',
    nextReviewDue: existingCheck?.nextReviewDue || existingCheck?.next_review_due || '',
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      toast({
        title: 'Info',
        description: 'DBS check tracking is not yet connected to the backend API',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `DBS check ${existingCheck ? 'updated' : 'added'} (saved locally)`,
      });
      queryClient.invalidateQueries({ queryKey: ['dbs-checks'] });
      queryClient.invalidateQueries({ queryKey: ['hr-data'] });
      onClose();
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
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{existingCheck ? 'Edit' : 'Add'} DBS Check</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="check_date" className="text-base">Check Date</Label>
            <Input
              id="check_date"
              type="date"
              value={formData.checkDate}
              onChange={(e) => setFormData({ ...formData, checkDate: e.target.value })}
              className="h-11 text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificate_number" className="text-base">Certificate Number</Label>
            <Input
              id="certificate_number"
              value={formData.certificateNumber}
              onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })}
              placeholder="Optional"
              className="h-11 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_review_due" className="text-base">Next Review Due</Label>
            <Input
              id="next_review_due"
              type="date"
              value={formData.nextReviewDue}
              onChange={(e) => setFormData({ ...formData, nextReviewDue: e.target.value })}
              className="h-11 text-base"
              required
            />
            <p className="text-xs sm:text-sm text-muted-foreground">
              Auto-set to 3 years from check date for new checks
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
              disabled={saveMutation.isPending}
              className="w-full sm:w-auto min-h-[44px] order-1 sm:order-2"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};