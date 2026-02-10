import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
      if (!user?.practiceId) throw new Error('Practice not found');

      const response = await fetch(`/api/practices/${user.practiceId}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          incidentDate: formData.incident_date,
          location: formData.location,
          category: formData.category,
          severity: formData.severity,
          description: formData.description,
          immediateActionTaken: formData.immediate_action_taken,
          peopleInvolved: formData.people_involved.split(',').map(p => p.trim()).filter(Boolean),
          witnesses: formData.witnesses.split(',').map(w => w.trim()).filter(Boolean),
          reportedBy: user.id,
          status: 'reported',
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to report incident' }));
        throw new Error(err.error || 'Failed to report incident');
      }

      return response.json();
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
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Report Incident</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incident-date" className="text-base">Date & Time *</Label>
              <Input
                id="incident-date"
                type="datetime-local"
                value={formData.incident_date}
                onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-base">Location *</Label>
              <Input
                id="location"
                placeholder="e.g., Waiting Room"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="h-11 text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-base">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger id="category" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="py-3">{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity" className="text-base">Severity *</Label>
              <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                <SelectTrigger id="severity" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_SEVERITIES.map(sev => (
                    <SelectItem key={sev.value} value={sev.value} className="py-3">
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
            <Label htmlFor="description" className="text-base">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what happened in detail..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="min-h-[100px] text-base resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="immediate-action" className="text-base">Immediate Action Taken</Label>
            <Textarea
              id="immediate-action"
              placeholder="Describe any immediate actions taken..."
              value={formData.immediate_action_taken}
              onChange={(e) => setFormData({ ...formData, immediate_action_taken: e.target.value })}
              rows={3}
              className="min-h-[80px] text-base resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="people-involved" className="text-base">People Involved</Label>
              <Input
                id="people-involved"
                placeholder="Names (comma-separated)"
                value={formData.people_involved}
                onChange={(e) => setFormData({ ...formData, people_involved: e.target.value })}
                className="h-11 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="witnesses" className="text-base">Witnesses</Label>
              <Input
                id="witnesses"
                placeholder="Names (comma-separated)"
                value={formData.witnesses}
                onChange={(e) => setFormData({ ...formData, witnesses: e.target.value })}
                className="h-11 text-base"
              />
            </div>
          </div>

          <div className="border-2 border-dashed rounded-lg p-6 sm:p-8 text-center touch-manipulation">
            <Camera className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm sm:text-base text-muted-foreground mb-3">Photo Evidence (Optional)</p>
            <Button 
              variant="outline" 
              size="lg"
              className="min-h-[44px] w-full sm:w-auto"
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Photo capture will be enabled soon
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
            onClick={() => createIncidentMutation.mutate()}
            disabled={
              !formData.location ||
              !formData.description ||
              createIncidentMutation.isPending
            }
            className="w-full sm:w-auto min-h-[44px] order-1 sm:order-2"
          >
            {createIncidentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Report Incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
