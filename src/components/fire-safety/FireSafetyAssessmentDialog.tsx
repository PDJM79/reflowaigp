import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface FireSafetyAssessmentDialogProps {
  open: boolean;
  onClose: () => void;
  assessmentId?: string;
  practiceId: string;
}

export const FireSafetyAssessmentDialog = ({ open, onClose, assessmentId, practiceId }: FireSafetyAssessmentDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    assessment_type: 'fire_risk' as 'fire_risk' | 'health_safety' | 'fire_drill' | 'equipment_check',
    assessment_date: new Date().toISOString().split('T')[0],
    next_assessment_due: '',
    overall_risk_rating: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    summary: '',
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: userData } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .single();

      const assessmentData = {
        ...data,
        practice_id: practiceId,
        assessor_id: userData?.id,
      };

      if (assessmentId) {
        const { error } = await (supabase as any)
          .from('fire_safety_assessments')
          .update(assessmentData)
          .eq('id', assessmentId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('fire_safety_assessments')
          .insert(assessmentData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Fire safety assessment ${assessmentId ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['fire-safety-assessments'] });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assessmentId ? 'Edit' : 'Create'} Fire Safety Assessment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assessment_type">Assessment Type</Label>
            <Select
              value={formData.assessment_type}
              onValueChange={(value: any) => setFormData({ ...formData, assessment_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fire_risk">Fire Risk Assessment</SelectItem>
                <SelectItem value="health_safety">Health & Safety Assessment</SelectItem>
                <SelectItem value="fire_drill">Fire Drill</SelectItem>
                <SelectItem value="equipment_check">Equipment Check</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assessment_date">Assessment Date</Label>
              <Input
                id="assessment_date"
                type="date"
                value={formData.assessment_date}
                onChange={(e) => setFormData({ ...formData, assessment_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_assessment_due">Next Assessment Due</Label>
              <Input
                id="next_assessment_due"
                type="date"
                value={formData.next_assessment_due}
                onChange={(e) => setFormData({ ...formData, next_assessment_due: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="overall_risk_rating">Overall Risk Rating</Label>
            <Select
              value={formData.overall_risk_rating}
              onValueChange={(value: any) => setFormData({ ...formData, overall_risk_rating: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              rows={4}
              placeholder="Summary of findings and recommendations..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Assessment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
