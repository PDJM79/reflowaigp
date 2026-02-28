import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  module: z.string().min(1, 'Module is required'),
  due_at: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high']),
});

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task?: any;
}

export function TaskDialog({ isOpen, onClose, onSuccess, task }: TaskDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    template_id: '',
    title: '',
    description: '',
    module: '',
    due_at: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    assigned_to_user_id: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchTemplatesAndUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (task) {
      setFormData({
        template_id: task.template_id || '',
        title: task.title || '',
        description: task.description || '',
        module: task.module || '',
        due_at: task.due_at ? new Date(task.due_at).toISOString().split('T')[0] : '',
        priority: task.priority || 'medium',
        assigned_to_user_id: task.assigned_to_user_id || '',
      });
    }
  }, [task]);

  const fetchTemplatesAndUsers = async () => {
    try {
      if (!user?.practiceId) return;

      const [templatesData, usersData] = await Promise.all([
        supabase
          .from('task_templates')
          .select('*')
          .eq('practice_id', user.practiceId),
        supabase
          .from('users')
          .select(`
            id,
            name,
            user_practice_roles(
              practice_roles(
                role_catalog(role_key, display_name)
              )
            )
          `)
          .eq('practice_id', user.practiceId)
          .eq('is_active', true),
      ]);

      setTemplates(templatesData.data || []);
      setUsers(usersData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        template_id: templateId,
        title: template.title,
        description: template.description || '',
        module: template.module,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = taskSchema.parse(formData);

      if (!user?.practiceId) throw new Error('User not found');

      const taskData = {
        practice_id: user.practiceId,
        title: validatedData.title,
        description: validatedData.description || '',
        module: validatedData.module,
        due_at: new Date(validatedData.due_at).toISOString(),
        priority: validatedData.priority,
        template_id: formData.template_id || null,
        assigned_to_user_id: formData.assigned_to_user_id || null,
        status: 'open',
      };

      if (task?.id) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', task.id);

        if (error) throw error;
        toast.success('Task updated successfully');
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([taskData]);

        if (error) throw error;
        toast.success('Task created successfully');
      }

      onSuccess();
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      } else {
        console.error('Error saving task:', error);
        toast.error('Failed to save task');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {task ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Create a task manually or from a template
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="template" className="text-base">Use Template (Optional)</Label>
            <Select
              value={formData.template_id}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select a template or create from scratch" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id} className="py-3">
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-base">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Task title"
              className="h-11 text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-base">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description..."
              rows={3}
              className="min-h-[80px] text-base resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="module" className="text-base">Module *</Label>
              <Select
                value={formData.module}
                onValueChange={(value) => setFormData({ ...formData, module: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month_end" className="py-3">Month-End</SelectItem>
                  <SelectItem value="claims" className="py-3">Claims</SelectItem>
                  <SelectItem value="infection_control" className="py-3">IC Audit</SelectItem>
                  <SelectItem value="cleaning" className="py-3">Cleaning</SelectItem>
                  <SelectItem value="incidents" className="py-3">Incidents</SelectItem>
                  <SelectItem value="fire_safety" className="py-3">Fire & H&S</SelectItem>
                  <SelectItem value="hr" className="py-3">HR</SelectItem>
                  <SelectItem value="complaints" className="py-3">Complaints</SelectItem>
                  <SelectItem value="medical_requests" className="py-3">Medicals</SelectItem>
                  <SelectItem value="policies" className="py-3">Policies</SelectItem>
                  <SelectItem value="fridge_temps" className="py-3">Fridge Temps</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-base">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="py-3">Low</SelectItem>
                  <SelectItem value="medium" className="py-3">Medium</SelectItem>
                  <SelectItem value="high" className="py-3">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_at" className="text-base">Due Date *</Label>
              <Input
                id="due_at"
                type="date"
                value={formData.due_at}
                onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
                className="h-11 text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to" className="text-base">Assign To</Label>
              <Select
                value={formData.assigned_to_user_id}
                onValueChange={(value) => setFormData({ ...formData, assigned_to_user_id: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => {
                    const roleKeys = u.user_practice_roles?.map((upr: any) => 
                      upr.practice_roles?.role_catalog?.role_key
                    ).filter(Boolean) || [];
                    return (
                      <SelectItem key={u.id} value={u.id} className="py-3">
                        {u.name} ({roleKeys.length > 0 ? roleKeys.join(', ') : 'No role'})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto min-h-[44px] order-1 sm:order-2"
            >
              {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
