import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FrequencyBadge } from "@/components/cleaning/FrequencyBadge";

export function CleaningTaskLibrary() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    frequency: 'full' as 'full' | 'spot' | 'check' | 'periodic' | 'touch',
    periodic_rule: '',
    is_active: true
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      const { data, error } = await supabase
        .from('cleaning_tasks')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .order('task_name');

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      if (editingTask) {
        const { error } = await supabase
          .from('cleaning_tasks')
          .update(formData)
          .eq('id', editingTask.id);

        if (error) throw error;
        toast.success('Task updated successfully');
      } else {
        const { error } = await supabase
          .from('cleaning_tasks')
          .insert({
            ...formData,
            practice_id: userData.practice_id
          });

        if (error) throw error;
        toast.success('Task created successfully');
      }

      setFormData({ task_name: '', description: '', frequency: 'full', periodic_rule: '', is_active: true });
      setEditingTask(null);
      fetchTasks();
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast.error(error.message || 'Failed to save task');
    }
  };

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setFormData({
      task_name: task.task_name,
      description: task.description || '',
      frequency: task.frequency,
      periodic_rule: task.periodic_rule || '',
      is_active: task.is_active
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('cleaning_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Task deleted successfully');
      fetchTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error(error.message || 'Failed to delete task');
    }
  };

  if (loading) return <p>Loading tasks...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingTask ? 'Edit' : 'Add'} Cleaning Task</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task_name">Task Name *</Label>
                <Input
                  id="task_name"
                  value={formData.task_name}
                  onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                  placeholder="e.g., Mop floors"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Clean</SelectItem>
                    <SelectItem value="spot">Spot Clean</SelectItem>
                    <SelectItem value="check">Check Only</SelectItem>
                    <SelectItem value="periodic">Periodic</SelectItem>
                    <SelectItem value="touch">Touch Point</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed cleaning instructions..."
                rows={3}
              />
            </div>

            {formData.frequency === 'periodic' && (
              <div className="space-y-2">
                <Label htmlFor="periodic_rule">Periodic Rule</Label>
                <Input
                  id="periodic_rule"
                  value={formData.periodic_rule}
                  onChange={(e) => setFormData({ ...formData, periodic_rule: e.target.value })}
                  placeholder="e.g., weekly, fortnightly, monthly"
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              {editingTask && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingTask(null);
                    setFormData({ task_name: '', description: '', frequency: 'full', periodic_rule: '', is_active: true });
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit">
                {editingTask ? 'Update' : 'Add'} Task
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Library ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Name</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.task_name}</TableCell>
                  <TableCell>
                    <FrequencyBadge frequency={task.frequency} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {task.description || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(task)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
