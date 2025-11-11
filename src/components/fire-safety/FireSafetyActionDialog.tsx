import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface FireSafetyActionDialogProps {
  open: boolean;
  onClose: () => void;
  assessmentId?: string;
  practiceId: string;
}

export const FireSafetyActionDialog = ({ open, onClose, assessmentId, practiceId }: FireSafetyActionDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    action_description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    timeframe: 'one_month' as 'immediate' | 'one_month' | 'three_months' | 'six_months' | 'twelve_months',
    assigned_to: '',
    due_date: '',
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-fire-action', practiceId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('users')
        .select('id, name')
        .eq('practice_id', practiceId)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: open,
  });

  // Auto-calculate due date based on timeframe
  useEffect(() => {
    if (formData.timeframe) {
      const today = new Date();
      let daysToAdd = 0;
      
      switch (formData.timeframe) {
        case 'immediate': daysToAdd = 7; break;
        case 'one_month': daysToAdd = 30; break;
        case 'three_months': daysToAdd = 90; break;
        case 'six_months': daysToAdd = 180; break;
        case 'twelve_months': daysToAdd = 365; break;
      }
      
      today.setDate(today.getDate() + daysToAdd);
      setFormData(prev => ({
        ...prev,
        due_date: today.toISOString().split('T')[0],
      }));
    }
  }, [formData.timeframe]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const actionData = {
        ...data,
        practice_id: practiceId,
        assessment_id: assessmentId || null,
        assigned_to: data.assigned_to || null,
      };

      const { error } = await (supabase as any)
        .from('fire_safety_actions')
        .insert(actionData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Fire safety action created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['fire-safety-actions'] });
      onClose();
      setFormData({
        action_description: '',
        severity: 'medium',
        timeframe: 'one_month',
        assigned_to: '',
        due_date: '',
      });
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
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Create Fire Safety Action</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="action_description" className="text-base">Action Description</Label>
            <Textarea
              id="action_description"
              value={formData.action_description}
              onChange={(e) => setFormData({ ...formData, action_description: e.target.value })}
              rows={3}
              required
              placeholder="Describe the required action..."
              className="min-h-[80px] text-base resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity" className="text-base">Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(value: any) => setFormData({ ...formData, severity: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="py-3">Low</SelectItem>
                  <SelectItem value="medium" className="py-3">Medium</SelectItem>
                  <SelectItem value="high" className="py-3">High</SelectItem>
                  <SelectItem value="critical" className="py-3">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframe" className="text-base">Timeframe</Label>
              <Select
                value={formData.timeframe}
                onValueChange={(value: any) => setFormData({ ...formData, timeframe: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate" className="py-3">Immediate (7 days)</SelectItem>
                  <SelectItem value="one_month" className="py-3">1 Month</SelectItem>
                  <SelectItem value="three_months" className="py-3">3 Months</SelectItem>
                  <SelectItem value="six_months" className="py-3">6 Months</SelectItem>
                  <SelectItem value="twelve_months" className="py-3">12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assigned_to" className="text-base">Assign To</Label>
              <Select
                value={formData.assigned_to}
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="py-3">Unassigned</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id} className="py-3">{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date" className="text-base">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="h-11 text-base"
                required
              />
            </div>
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
              {saveMutation.isPending ? 'Creating...' : 'Create Action'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
