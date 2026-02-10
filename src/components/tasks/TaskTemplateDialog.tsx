import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
        default_assignee_role: template.defaultAssigneeRole || template.default_assignee_role || '',
        requires_photo: template.requiresPhoto || template.requires_photo || false,
        sla_type: template.slaType || template.sla_type || '',
        due_rule: template.dueRule || template.due_rule || '',
        evidence_tags: template.evidenceTags || template.evidence_tags || [],
        allowed_roles: template.allowedRoles || template.allowed_roles || [],
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
    if (!user?.practiceId) {
      toast.error('Practice not found');
      return;
    }

    setLoading(true);

    try {
      const validatedData = templateSchema.parse(formData);

      const templateData = {
        title: validatedData.title,
        description: validatedData.description || '',
        module: validatedData.module,
        defaultAssigneeRole: validatedData.default_assignee_role,
        requiresPhoto: validatedData.requires_photo,
        slaType: validatedData.sla_type || null,
        dueRule: validatedData.due_rule || null,
        evidenceTags: formData.evidence_tags.length > 0 ? formData.evidence_tags : null,
        allowedRoles: formData.allowed_roles.length > 0 ? formData.allowed_roles : null,
      };

      const templateId = template?.id;
      const url = templateId
        ? `/api/practices/${user.practiceId}/process-templates/${templateId}`
        : `/api/practices/${user.practiceId}/process-templates`;
      const method = templateId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to save template' }));
        throw new Error(err.error || 'Failed to save template');
      }

      toast.success(templateId ? 'Template updated successfully' : 'Template created successfully');
      onSuccess();
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      } else if (error instanceof Error) {
        console.error('Error saving template:', error);
        toast.error(error.message || 'Failed to save template');
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
