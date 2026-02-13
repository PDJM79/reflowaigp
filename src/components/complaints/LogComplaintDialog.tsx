import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, addWeeks, addMonths } from 'date-fns';

interface LogComplaintDialogProps {
  children?: React.ReactNode;
}

export function LogComplaintDialog({ children }: LogComplaintDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    channel: '',
    severity: 'medium',
    complainant_name: '',
    description: '',
    assigned_to: '',
    sla_timescale: 'month',
    category: 'other',
  });

  const { data: userData } = useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: practiceUsers } = useQuery({
    queryKey: ['practice-users', userData?.practice_id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('users')
        .select('id, full_name')
        .eq('practice_id', userData?.practice_id);
      return data || [];
    },
    enabled: !!userData?.practice_id,
  });

  const createComplaint = useMutation({
    mutationFn: async () => {
      const receivedAt = new Date();
      let ackDue: Date;
      let finalDue: Date;

      // Calculate SLA dates based on timescale
      switch (formData.sla_timescale) {
        case 'day':
          ackDue = addDays(receivedAt, 1);
          finalDue = addDays(receivedAt, 3);
          break;
        case 'week':
          ackDue = addDays(receivedAt, 2);
          finalDue = addWeeks(receivedAt, 1);
          break;
        case 'month':
        default:
          ackDue = addDays(receivedAt, 2);
          finalDue = addMonths(receivedAt, 1);
          break;
      }

      const { error } = await (supabase as any)
        .from('complaints')
        .insert({
          practice_id: userData?.practice_id,
          channel: formData.channel,
          severity: formData.severity,
          complainant_name: formData.complainant_name,
          description: formData.description,
          assigned_to: formData.assigned_to || null,
          sla_timescale: formData.sla_timescale,
          sla_status: 'on_track',
          category: formData.category,
          received_at: receivedAt.toISOString(),
          ack_due: ackDue.toISOString(),
          final_due: finalDue.toISOString(),
          status: 'open',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Complaint logged successfully');
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['complaints-dashboard'] });
      resetForm();
      setOpen(false);
    },
    onError: (error: any) => {
      toast.error('Failed to log complaint: ' + error.message);
    },
  });

  const resetForm = () => {
    setStep(1);
    setFormData({
      channel: '',
      severity: 'medium',
      complainant_name: '',
      description: '',
      assigned_to: '',
      sla_timescale: 'month',
      category: 'other',
    });
  };

  const canProceedStep1 = formData.channel && formData.severity;
  const canProceedStep2 = formData.complainant_name && formData.description;
  const canSubmit = canProceedStep1 && canProceedStep2;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Log Complaint
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log New Complaint - Step {step} of 3</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Source / Channel *</Label>
              <Select 
                value={formData.channel} 
                onValueChange={(value) => setFormData({ ...formData, channel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How was the complaint received?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="letter">Letter</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="online_form">Online Form</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity *</Label>
              <Select 
                value={formData.severity} 
                onValueChange={(value) => setFormData({ ...formData, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor issue</SelectItem>
                  <SelectItem value="medium">Medium - Requires attention</SelectItem>
                  <SelectItem value="high">High - Urgent/Serious</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinical_care">Clinical Care</SelectItem>
                  <SelectItem value="staff_attitude">Staff Attitude</SelectItem>
                  <SelectItem value="waiting_times">Waiting Times</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="prescriptions">Prescriptions</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="complainant_name">Complainant Name *</Label>
              <Input
                id="complainant_name"
                value={formData.complainant_name}
                onChange={(e) => setFormData({ ...formData, complainant_name: e.target.value })}
                placeholder="Enter complainant's name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Complaint Details *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the complaint in detail..."
                rows={4}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assign To</Label>
              <Select 
                value={formData.assigned_to} 
                onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {practiceUsers?.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sla_timescale">SLA Timescale</Label>
              <Select 
                value={formData.sla_timescale} 
                onValueChange={(value) => setFormData({ ...formData, sla_timescale: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select response deadline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Urgent (1 Day)</SelectItem>
                  <SelectItem value="week">Standard (1 Week)</SelectItem>
                  <SelectItem value="month">Extended (1 Month)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Summary</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>Source: {formData.channel}</li>
                <li>Severity: {formData.severity}</li>
                <li>Complainant: {formData.complainant_name}</li>
                <li>Category: {formData.category.replace('_', ' ')}</li>
              </ul>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button 
                onClick={() => createComplaint.mutate()} 
                disabled={!canSubmit || createComplaint.isPending}
              >
                {createComplaint.isPending ? 'Saving...' : 'Submit Complaint'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}