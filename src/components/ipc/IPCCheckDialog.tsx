import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface IPCCheckDialogProps {
  auditId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const SECTIONS = [
  "General",
  "Toilets",
  "Kitchen",
  "Consultation Rooms",
  "Treatment Rooms"
] as const;

export function IPCCheckDialog({ auditId, open, onOpenChange, onSuccess }: IPCCheckDialogProps) {
  const [formData, setFormData] = useState({
    section: 'General' as typeof SECTIONS[number],
    area: '',
    item: '',
    response: 'yes' as 'yes' | 'no' | 'na',
    comments: '',
    photo_url: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      toast("This feature will be available in a future update", {
        description: "IPC check recording is coming soon"
      });
      setFormData({
        section: 'General',
        area: '',
        item: '',
        response: 'yes',
        comments: '',
        photo_url: ''
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving IPC check:', error);
      toast.error('Failed to save IPC check');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record IPC Check</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="section">Section *</Label>
              <Select value={formData.section} onValueChange={(value: any) => setFormData({ ...formData, section: value })}>
                <SelectTrigger id="section">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map(section => (
                    <SelectItem key={section} value={section}>{section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Area/Room *</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="e.g., Treatment Room 1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item">Item to Check *</Label>
            <Input
              id="item"
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              placeholder="e.g., Hand hygiene facilities available"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="response">Response *</Label>
            <Select value={formData.response} onValueChange={(value: any) => setFormData({ ...formData, response: value })}>
              <SelectTrigger id="response">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes - Compliant</SelectItem>
                <SelectItem value="no">No - Action Required</SelectItem>
                <SelectItem value="na">N/A - Not Applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              rows={3}
              placeholder="Additional notes or observations..."
            />
          </div>

          <div className="space-y-2">
            <Label>Photo Evidence (optional)</Label>
            <Input
              type="url"
              value={formData.photo_url}
              onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
              placeholder="Photo URL (upload via evidence module)"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Check'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
