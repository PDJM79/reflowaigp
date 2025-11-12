import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AppraisalDialogProps {
  employeeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AppraisalDialog({ employeeId, open, onOpenChange, onSuccess }: AppraisalDialogProps) {
  const [formData, setFormData] = useState({
    period_start: new Date(new Date().getFullYear(), 0, 1),
    period_end: new Date(new Date().getFullYear(), 11, 31),
    jd_changes: '',
    achievements: '',
    challenges: '',
    support_needs: '',
    teamwork_rating: 3,
    communication_rating: 3,
    skills_rating: 3,
    attendance_rating: 3
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id, id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      const ratings = {
        teamwork: formData.teamwork_rating,
        communication: formData.communication_rating,
        skills: formData.skills_rating,
        attendance: formData.attendance_rating
      };

      const { data: appraisal, error } = await supabase
        .from('hr_appraisals')
        .insert([{
          practice_id: userData.practice_id,
          employee_id: employeeId,
          reviewer_id: userData.id,
          period_start: formData.period_start.toISOString().split('T')[0],
          period_end: formData.period_end.toISOString().split('T')[0],
          jd_changes: formData.jd_changes || null,
          achievements: formData.achievements || null,
          challenges: formData.challenges || null,
          support_needs: formData.support_needs || null,
          ratings: ratings
        }])
        .select()
        .single();

      if (error) throw error;

      // Auto-generate HR actions from support needs
      if (formData.support_needs) {
        await supabase.from('hr_actions').insert([{
          practice_id: userData.practice_id,
          employee_id: employeeId,
          source: 'appraisal',
          source_id: appraisal.id,
          action_description: `Appraisal Support Need: ${formData.support_needs}`,
          due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'open'
        }]);
      }

      toast.success('Appraisal saved successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving appraisal:', error);
      toast.error('Failed to save appraisal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Annual Appraisal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Period Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.period_start, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.period_start}
                    onSelect={(date) => date && setFormData({ ...formData, period_start: date })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Period End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.period_end, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.period_end}
                    onSelect={(date) => date && setFormData({ ...formData, period_end: date })}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Performance Ratings (1-5)</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'teamwork_rating', label: 'Teamwork' },
                { key: 'communication_rating', label: 'Communication' },
                { key: 'skills_rating', label: 'Skills & Knowledge' },
                { key: 'attendance_rating', label: 'Attendance & Punctuality' }
              ].map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={(formData as any)[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: parseInt(e.target.value) })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Job Description Changes</Label>
            <Textarea
              value={formData.jd_changes}
              onChange={(e) => setFormData({ ...formData, jd_changes: e.target.value })}
              rows={3}
              placeholder="Any changes to role or responsibilities..."
            />
          </div>

          <div className="space-y-2">
            <Label>Key Achievements</Label>
            <Textarea
              value={formData.achievements}
              onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
              rows={3}
              placeholder="Notable accomplishments this period..."
            />
          </div>

          <div className="space-y-2">
            <Label>Challenges Faced</Label>
            <Textarea
              value={formData.challenges}
              onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
              rows={3}
              placeholder="Difficulties or obstacles encountered..."
            />
          </div>

          <div className="space-y-2">
            <Label>Support Needs & Development Areas</Label>
            <Textarea
              value={formData.support_needs}
              onChange={(e) => setFormData({ ...formData, support_needs: e.target.value })}
              rows={3}
              placeholder="Training needs, development goals, or support required..."
            />
            <p className="text-sm text-muted-foreground">
              These will automatically generate HR actions
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Appraisal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
