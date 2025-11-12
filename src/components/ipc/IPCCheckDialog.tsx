import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileUpload } from "@/components/evidence/FileUpload";

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      const { error } = await supabase
        .from('ipc_checks')
        .insert([{
          audit_id: auditId,
          practice_id: userData.practice_id,
          section: formData.section,
          area: formData.area,
          item: formData.item,
          response: formData.response,
          comments: formData.comments || null,
          photo_url: formData.photo_url || null
        }]);

      if (error) throw error;

      toast.success('IPC check recorded successfully');
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
            <FileUpload
              onUploadComplete={(url) => setFormData({ ...formData, photo_url: url })}
              accept="image/*"
              maxSize={5 * 1024 * 1024}
            />
            {formData.photo_url && (
              <p className="text-sm text-muted-foreground">Photo uploaded</p>
            )}
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
