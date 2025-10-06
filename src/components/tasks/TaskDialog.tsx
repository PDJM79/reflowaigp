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
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;

      const [templatesData, usersData] = await Promise.all([
        supabase
          .from('task_templates')
          .select('*')
          .eq('practice_id', userData.practice_id),
        supabase
          .from('users')
          .select('id, name, role')
          .eq('practice_id', userData.practice_id)
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

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User not found');

      const taskData = {
        practice_id: userData.practice_id,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {task ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription>
            Create a task manually or from a template
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">Use Template (Optional)</Label>
            <Select
              value={formData.template_id}
              onValueChange={handleTemplateChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a template or create from scratch" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Task title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description..."
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
                  <SelectItem value="month_end">Month-End</SelectItem>
                  <SelectItem value="claims">Claims</SelectItem>
                  <SelectItem value="infection_control">IC Audit</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="incidents">Incidents</SelectItem>
                  <SelectItem value="fire_safety">Fire & H&S</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="complaints">Complaints</SelectItem>
                  <SelectItem value="medical_requests">Medicals</SelectItem>
                  <SelectItem value="policies">Policies</SelectItem>
                  <SelectItem value="fridge_temps">Fridge Temps</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_at">Due Date *</Label>
              <Input
                id="due_at"
                type="date"
                value={formData.due_at}
                onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assign To</Label>
              <Select
                value={formData.assigned_to_user_id}
                onValueChange={(value) => setFormData({ ...formData, assigned_to_user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
