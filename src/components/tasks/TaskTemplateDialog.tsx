import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';

const templateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  module: z.string().min(1, 'Module is required'),
  default_assignee_role: z.string().min(1, 'Default assignee role is required'),
  requires_photo: z.boolean(),
  sla_type: z.string().optional(),
  due_rule: z.string().optional(),
});

interface TaskTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template?: any;
}

export function TaskTemplateDialog({ isOpen, onClose, onSuccess, template }: TaskTemplateDialogProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    module: '',
    default_assignee_role: '',
    requires_photo: false,
    sla_type: '',
    due_rule: '',
    evidence_tags: [] as string[],
    allowed_roles: [] as string[],
  });

  useEffect(() => {
    if (template) {
      setFormData({
        title: template.title || '',
        description: template.description || '',
        module: template.module || '',
        default_assignee_role: template.default_assignee_role || '',
        requires_photo: template.requires_photo || false,
        sla_type: template.sla_type || '',
        due_rule: template.due_rule || '',
        evidence_tags: template.evidence_tags || [],
        allowed_roles: template.allowed_roles || [],
      });
    } else {
      setFormData({
        title: '',
        description: '',
        module: '',
        default_assignee_role: '',
        requires_photo: false,
        sla_type: '',
        due_rule: '',
        evidence_tags: [],
        allowed_roles: [],
      });
    }
  }, [template]);

  const modules = [
    'month_end',
    'claims',
    'infection_control',
    'cleaning',
    'incidents',
    'fire_safety',
    'hr',
    'complaints',
    'medical_requests',
    'policies',
    'fridge_temps',
    'schedule',
    'reports',
  ];

  const roles = [
    'practice_manager',
    'administrator',
    'nurse_lead',
    'estates_lead',
    'ig_lead',
    'reception_lead',
    'gp',
    'nurse',
    'reception',
    'estates',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = templateSchema.parse(formData);

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User not found');

      const templateData = {
        practice_id: userData.practice_id,
        title: validatedData.title,
        description: validatedData.description || '',
        module: validatedData.module,
        default_assignee_role: validatedData.default_assignee_role as any,
        requires_photo: validatedData.requires_photo,
        sla_type: validatedData.sla_type || null,
        due_rule: validatedData.due_rule || null,
        evidence_tags: formData.evidence_tags.length > 0 ? formData.evidence_tags : null,
        allowed_roles: formData.allowed_roles.length > 0 ? formData.allowed_roles as any : null,
      };

      if (template?.id) {
        const { error } = await supabase
          .from('task_templates')
          .update(templateData)
          .eq('id', template.id);

        if (error) throw error;
        toast.success('Template updated successfully');
      } else {
        const { error } = await supabase
          .from('task_templates')
          .insert([templateData]);

        if (error) throw error;
        toast.success('Template created successfully');
      }

      onSuccess();
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      } else {
        console.error('Error saving template:', error);
        toast.error('Failed to save template');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Task Template' : 'Create Task Template'}
          </DialogTitle>
          <DialogDescription>
            Define a template for recurring tasks. This will be used to create task instances.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Monthly Infection Control Audit"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this task involves..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="module">Module *</Label>
              <Select
                value={formData.module}
                onValueChange={(value) => setFormData({ ...formData, module: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {t(`modules.${module}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_role">Default Assignee Role *</Label>
              <Select
                value={formData.default_assignee_role}
                onValueChange={(value) => setFormData({ ...formData, default_assignee_role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sla_type">SLA Type</Label>
              <Select
                value={formData.sla_type}
                onValueChange={(value) => setFormData({ ...formData, sla_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select SLA type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="same_day">Same Day</SelectItem>
                  <SelectItem value="24_hours">24 Hours</SelectItem>
                  <SelectItem value="48_hours">48 Hours</SelectItem>
                  <SelectItem value="7_days">7 Days</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_rule">Due Rule (RRule format)</Label>
              <Input
                id="due_rule"
                value={formData.due_rule}
                onChange={(e) => setFormData({ ...formData, due_rule: e.target.value })}
                placeholder="e.g., FREQ=MONTHLY;BYMONTHDAY=1"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="requires_photo"
              checked={formData.requires_photo}
              onCheckedChange={(checked) => setFormData({ ...formData, requires_photo: checked })}
            />
            <Label htmlFor="requires_photo">Requires photo evidence</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
