import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface IPCActionDialogProps {
  submissionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEVERITIES = [
  { value: 'urgent', label: 'Urgent', days: 7 },
  { value: 'high', label: 'High', days: 30 },
  { value: 'medium', label: 'Medium', days: 90 },
  { value: 'low', label: 'Low', days: 180 },
];

const TIMEFRAMES = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'one_month', label: '1 Month' },
  { value: 'three_months', label: '3 Months' },
  { value: 'six_months', label: '6 Months' },
  { value: 'annual', label: 'Annual' },
];

export function IPCActionDialog({ submissionId, open, onOpenChange }: IPCActionDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    action_description: '',
    severity: 'medium',
    timeframe: 'three_months',
    assigned_to_role: '',
  });

  // Fetch available users
  const { data: users = [] } = useQuery({
    queryKey: ['users-for-assignment', user?.id],
    queryFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return [];

      const { data, error } = await supabase
        .from('users')
        .select('id, name')
        .eq('practice_id', userData.practice_id)
        .eq('is_active', true);

      if (error) throw error;
      return data;
    },
    enabled: open && !!user?.id,
  });

  const createActionMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User not found');

      // Calculate due date based on severity
      const severity = SEVERITIES.find(s => s.value === formData.severity);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (severity?.days || 90));

      const { error } = await supabase
        .from('ipc_actions' as any)
        .insert({
          submission_id: submissionId,
          practice_id: userData.practice_id,
          action_description: formData.action_description,
          severity: formData.severity,
          timeframe: formData.timeframe,
          assigned_to_role: formData.assigned_to_role || null,
          due_date: dueDate.toISOString().split('T')[0],
          status: 'open',
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('IPC action created');
      queryClient.invalidateQueries({ queryKey: ['ipc-actions'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to create action', { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      action_description: '',
      severity: 'medium',
      timeframe: 'three_months',
      assigned_to_role: '',
    });
  };

  const selectedSeverity = SEVERITIES.find(s => s.value === formData.severity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Create IPC Action</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="action-description" className="text-base">Action Description *</Label>
            <Textarea
              id="action-description"
              placeholder="Describe the action required..."
              value={formData.action_description}
              onChange={(e) => setFormData({ ...formData, action_description: e.target.value })}
              rows={4}
              className="min-h-[100px] text-base resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity" className="text-base">Severity *</Label>
              <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                <SelectTrigger id="severity" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map(sev => (
                    <SelectItem key={sev.value} value={sev.value} className="py-3">
                      {sev.label} ({sev.days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSeverity && (
                <p className="text-xs text-muted-foreground">
                  Due date will be {selectedSeverity.days} days from now
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframe" className="text-base">Timeframe</Label>
              <Select value={formData.timeframe} onValueChange={(value) => setFormData({ ...formData, timeframe: value })}>
                <SelectTrigger id="timeframe" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map(tf => (
                    <SelectItem key={tf.value} value={tf.value} className="py-3">{tf.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned-role" className="text-base">Assign To Role (Optional)</Label>
            <Select value={formData.assigned_to_role} onValueChange={(value) => setFormData({ ...formData, assigned_to_role: value })}>
              <SelectTrigger id="assigned-role" className="h-11">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="practice_manager" className="py-3">Practice Manager</SelectItem>
                <SelectItem value="nurse_lead" className="py-3">Nurse Lead</SelectItem>
                <SelectItem value="estates_lead" className="py-3">Estates Lead</SelectItem>
                <SelectItem value="nurse" className="py-3">Practice Nurse</SelectItem>
                <SelectItem value="gp" className="py-3">GP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Actions will appear in the assigned role's task list and send reminder notifications based on severity.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button
            onClick={() => createActionMutation.mutate()}
            disabled={!formData.action_description || createActionMutation.isPending}
            className="w-full sm:w-auto min-h-[44px] order-1 sm:order-2"
          >
            {createActionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
