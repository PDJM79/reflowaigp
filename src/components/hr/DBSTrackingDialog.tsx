import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
    check_date: existingCheck?.check_date || new Date().toISOString().split('T')[0],
    certificate_number: existingCheck?.certificate_number || '',
    next_review_due: existingCheck?.next_review_due || '',
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const dbsData = {
        ...data,
        employee_id: employeeId,
        practice_id: practiceId,
      };

      if (existingCheck?.id) {
        const { error } = await (supabase as any)
          .from('dbs_checks')
          .update(dbsData)
          .eq('id', existingCheck.id);
        if (error) throw error;
      } else {
        // Auto-calculate next review (3 years from check date)
        const checkDate = new Date(data.check_date);
        checkDate.setFullYear(checkDate.getFullYear() + 3);
        dbsData.next_review_due = checkDate.toISOString().split('T')[0];

        const { error } = await (supabase as any)
          .from('dbs_checks')
          .insert(dbsData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `DBS check ${existingCheck ? 'updated' : 'added'} successfully`,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingCheck ? 'Edit' : 'Add'} DBS Check</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="check_date">Check Date</Label>
            <Input
              id="check_date"
              type="date"
              value={formData.check_date}
              onChange={(e) => setFormData({ ...formData, check_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificate_number">Certificate Number</Label>
            <Input
              id="certificate_number"
              value={formData.certificate_number}
              onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_review_due">Next Review Due</Label>
            <Input
              id="next_review_due"
              type="date"
              value={formData.next_review_due}
              onChange={(e) => setFormData({ ...formData, next_review_due: e.target.value })}
              required
            />
            <p className="text-sm text-muted-foreground">
              Auto-set to 3 years from check date for new checks
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
