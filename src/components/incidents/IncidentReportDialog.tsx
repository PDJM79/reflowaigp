import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface IncidentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INCIDENT_CATEGORIES = [
  { value: 'patient_fall', label: 'Patient Fall' },
  { value: 'medication_error', label: 'Medication Error' },
  { value: 'equipment_failure', label: 'Equipment Failure' },
  { value: 'staff_injury', label: 'Staff Injury' },
  { value: 'security_breach', label: 'Security Breach' },
  { value: 'infection_control', label: 'Infection Control' },
  { value: 'near_miss', label: 'Near Miss' },
  { value: 'other', label: 'Other' },
];

const INCIDENT_SEVERITIES = [
  { value: 'minor', label: 'Minor', description: 'No harm, minimal impact' },
  { value: 'moderate', label: 'Moderate', description: 'Some harm, moderate impact' },
  { value: 'major', label: 'Major', description: 'Significant harm, major impact' },
  { value: 'critical', label: 'Critical', description: 'Severe harm, critical impact' },
];

export function IncidentReportDialog({ open, onOpenChange }: IncidentReportDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    incident_date: new Date().toISOString().slice(0, 16),
    location: '',
    category: 'other',
    severity: 'minor',
    description: '',
    immediate_action_taken: '',
    people_involved: '',
    witnesses: '',
  });

  const createIncidentMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User not found');

      const { error } = await supabase
        .from('incidents' as any)
        .insert({
          practice_id: userData.practice_id,
          incident_date: formData.incident_date,
          location: formData.location,
          category: formData.category,
          severity: formData.severity,
          description: formData.description,
          immediate_action_taken: formData.immediate_action_taken,
          people_involved: formData.people_involved.split(',').map(p => p.trim()).filter(Boolean),
          witnesses: formData.witnesses.split(',').map(w => w.trim()).filter(Boolean),
          reported_by: userData.id,
          status: 'reported',
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Incident reported successfully', {
        description: 'Practice managers have been notified',
      });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to report incident', { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      incident_date: new Date().toISOString().slice(0, 16),
      location: '',
      category: 'other',
      severity: 'minor',
      description: '',
      immediate_action_taken: '',
      people_involved: '',
      witnesses: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Incident</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incident-date">Date & Time *</Label>
              <Input
                id="incident-date"
                type="datetime-local"
                value={formData.incident_date}
                onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                placeholder="e.g., Waiting Room"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity *</Label>
              <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_SEVERITIES.map(sev => (
                    <SelectItem key={sev.value} value={sev.value}>
                      <div>
                        <div className="font-medium">{sev.label}</div>
                        <div className="text-xs text-muted-foreground">{sev.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what happened in detail..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="immediate-action">Immediate Action Taken</Label>
            <Textarea
              id="immediate-action"
              placeholder="Describe any immediate actions taken..."
              value={formData.immediate_action_taken}
              onChange={(e) => setFormData({ ...formData, immediate_action_taken: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="people-involved">People Involved</Label>
              <Input
                id="people-involved"
                placeholder="Names (comma-separated)"
                value={formData.people_involved}
                onChange={(e) => setFormData({ ...formData, people_involved: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="witnesses">Witnesses</Label>
              <Input
                id="witnesses"
                placeholder="Names (comma-separated)"
                value={formData.witnesses}
                onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })}
              />
            </div>
          </div>

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">Photo Evidence (Optional)</p>
            <Button variant="outline" size="sm">
              Upload Photos
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Photo upload will be available after initial report
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createIncidentMutation.mutate()}
            disabled={
              !formData.location ||
              !formData.description ||
              createIncidentMutation.isPending
            }
          >
            {createIncidentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Report Incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
