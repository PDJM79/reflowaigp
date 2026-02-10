import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RoomAssessmentDialogProps {
  roomId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Finding {
  id: string;
  item: string;
  status: 'pass' | 'fail' | 'action_required';
  notes: string;
  photo_url: string;
}

export function RoomAssessmentDialog({ roomId, open, onOpenChange, onSuccess }: RoomAssessmentDialogProps) {
  const [assessmentDate, setAssessmentDate] = useState<Date>(new Date());
  const [findings, setFindings] = useState<Finding[]>([
    { id: '1', item: '', status: 'pass', notes: '', photo_url: '' }
  ]);
  const [saving, setSaving] = useState(false);

  const addFinding = () => {
    setFindings([...findings, {
      id: Date.now().toString(),
      item: '',
      status: 'pass',
      notes: '',
      photo_url: ''
    }]);
  };

  const removeFinding = (id: string) => {
    setFindings(findings.filter(f => f.id !== id));
  };

  const updateFinding = (id: string, updates: Partial<Finding>) => {
    setFindings(findings.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      toast("This feature will be available in a future update", {
        description: "Room assessment saving is coming soon"
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving room assessment:', error);
      toast.error('Failed to save room assessment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Annual Room Assessment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Assessment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(assessmentDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={assessmentDate}
                  onSelect={(date) => date && setAssessmentDate(date)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">Assessment Findings</Label>
              <Button type="button" size="sm" onClick={addFinding}>
                <Plus className="h-4 w-4 mr-1" />
                Add Finding
              </Button>
            </div>

            {findings.map((finding, index) => (
              <div key={finding.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium">Finding {index + 1}</span>
                  {findings.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFinding(finding.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label>Item Description *</Label>
                    <Input
                      value={finding.item}
                      onChange={(e) => updateFinding(finding.id, { item: e.target.value })}
                      placeholder="e.g., Fire extinguisher present and in date"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status *</Label>
                    <Select
                      value={finding.status}
                      onValueChange={(value: any) => updateFinding(finding.id, { status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pass">Pass</SelectItem>
                        <SelectItem value="fail">Fail</SelectItem>
                        <SelectItem value="action_required">Action Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Photo URL</Label>
                    <Input
                      type="url"
                      value={finding.photo_url}
                      onChange={(e) => updateFinding(finding.id, { photo_url: e.target.value })}
                      placeholder="Photo URL"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={finding.notes}
                      onChange={(e) => updateFinding(finding.id, { notes: e.target.value })}
                      rows={2}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Assessment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
