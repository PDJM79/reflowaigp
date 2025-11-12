import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";

interface TrainingCatalogueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  trainingType?: any;
}

export function TrainingCatalogueDialog({ open, onOpenChange, onSuccess, trainingType }: TrainingCatalogueDialogProps) {
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    title: '',
    level: '',
    recurrence_months: null as number | null,
    certificate_required: true,
    audience_roles: [] as string[],
    tags: {}
  });

  useEffect(() => {
    if (trainingType) {
      setFormData({
        key: trainingType.key || '',
        title: trainingType.title || '',
        level: trainingType.level || '',
        recurrence_months: trainingType.recurrence_months,
        certificate_required: trainingType.certificate_required ?? true,
        audience_roles: trainingType.audience_roles || [],
        tags: trainingType.tags || {}
      });
    }
  }, [trainingType]);

  const handleSeedCatalogue = async () => {
    setSeeding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      const { error } = await supabase.functions.invoke('seed-training-catalogue', {
        body: { practiceId: userData.practice_id }
      });

      if (error) throw error;

      toast.success('Training catalogue seeded with NHS defaults');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error seeding catalogue:', error);
      toast.error('Failed to seed training catalogue');
    } finally {
      setSeeding(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      const payload = {
        practice_id: userData.practice_id,
        key: formData.key,
        title: formData.title,
        level: formData.level || null,
        recurrence_months: formData.recurrence_months,
        certificate_required: formData.certificate_required,
        audience_roles: formData.audience_roles,
        tags: formData.tags
      };

      if (trainingType) {
        const { error } = await supabase
          .from('training_types')
          .update(payload)
          .eq('id', trainingType.id);
        if (error) throw error;
        toast.success('Training type updated');
      } else {
        const { error } = await supabase
          .from('training_types')
          .insert([payload]);
        if (error) throw error;
        toast.success('Training type created');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving training type:', error);
      toast.error('Failed to save training type');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{trainingType ? 'Edit' : 'Add'} Training Type</DialogTitle>
        </DialogHeader>

        {!trainingType && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              🎯 Want to start with NHS standard training requirements?
            </p>
            <Button
              variant="outline"
              onClick={handleSeedCatalogue}
              disabled={seeding}
              className="w-full"
            >
              {seeding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Seed NHS Training Catalogue (17 courses)
            </Button>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="key">Key (slug) *</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="e.g., fire-safety-l1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Fire Safety Level 1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Input
                id="level"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                placeholder="e.g., L1, L2, Adult, Child"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurrence">Recurrence (months)</Label>
              <Input
                id="recurrence"
                type="number"
                value={formData.recurrence_months || ''}
                onChange={(e) => setFormData({ ...formData, recurrence_months: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="Leave empty for one-off"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="certificate_required"
              checked={formData.certificate_required}
              onCheckedChange={(checked) => setFormData({ ...formData, certificate_required: !!checked })}
            />
            <label htmlFor="certificate_required" className="text-sm cursor-pointer">
              Certificate required for compliance
            </label>
          </div>

          <div className="space-y-2">
            <Label>Audience Roles (comma-separated)</Label>
            <Input
              value={formData.audience_roles.join(', ')}
              onChange={(e) => setFormData({
                ...formData,
                audience_roles: e.target.value.split(',').map(r => r.trim()).filter(Boolean)
              })}
              placeholder="gp, nurse, hca, admin, estates"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.key || !formData.title || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {trainingType ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
