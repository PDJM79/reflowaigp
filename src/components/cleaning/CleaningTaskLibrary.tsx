import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
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
    frequency: 'daily' as 'full' | 'spot' | 'check' | 'periodic' | 'touch',
    periodic_rule: ''
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
        .eq('is_active', true)
        .order('task_name');

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load cleaning tasks');
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
          .update({
            task_name: formData.task_name,
            description: formData.description,
            frequency: formData.frequency,
            periodic_rule: formData.periodic_rule || null
          })
          .eq('id', editingTask.id);

        if (error) throw error;
        toast.success('Task updated successfully');
      } else {
        const { error } = await supabase
          .from('cleaning_tasks')
          .insert([{
            practice_id: userData.practice_id,
            task_name: formData.task_name,
            description: formData.description,
            frequency: formData.frequency,
            periodic_rule: formData.periodic_rule || null
          }]);

        if (error) throw error;
        toast.success('Task created successfully');
      }

      setFormData({ task_name: '', description: '', frequency: 'daily', periodic_rule: '' });
      setEditingTask(null);
      fetchTasks();
    } catch (error: any) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task');
    }
  };

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setFormData({
      task_name: task.task_name,
      description: task.description || '',
      frequency: task.frequency,
      periodic_rule: task.periodic_rule || ''
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('cleaning_tasks')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Task deleted successfully');
      fetchTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  if (loading) return <p>Loading task library...</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</CardTitle>
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
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Select value={formData.frequency} onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Clean</SelectItem>
                    <SelectItem value="spot">Spot Clean</SelectItem>
                    <SelectItem value="check">Visual Check</SelectItem>
                    <SelectItem value="periodic">Periodic (weekly/monthly)</SelectItem>
                    <SelectItem value="touch">Touch Point</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.frequency === 'periodic' && (
              <div className="space-y-2">
                <Label htmlFor="periodic_rule">Periodic Rule</Label>
                <Input
                  id="periodic_rule"
                  value={formData.periodic_rule}
                  onChange={(e) => setFormData({ ...formData, periodic_rule: e.target.value })}
                  placeholder="e.g., Weekly, Fortnightly, Monthly"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                {editingTask ? 'Update Task' : 'Add Task'}
              </Button>
              {editingTask && (
                <Button type="button" variant="outline" onClick={() => {
                  setEditingTask(null);
                  setFormData({ task_name: '', description: '', frequency: 'daily', periodic_rule: '' });
                }}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Library</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Name</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Periodic Rule</TableHead>
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
                  <TableCell className="text-sm text-muted-foreground">
                    {task.periodic_rule || '-'}
                  </TableCell>
                  <TableCell className="text-sm">{task.description || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
