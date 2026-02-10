import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { FrequencyBadge } from "@/components/cleaning/FrequencyBadge";

export function CleaningTaskLibrary() {
  const [tasks] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [formData, setFormData] = useState({
    task_name: '',
    description: '',
    frequency: 'full' as 'full' | 'spot' | 'check' | 'periodic' | 'touch',
    periodic_rule: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast("This feature will be available in a future update", {
      description: "Cleaning task management is coming soon"
    });
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

  const handleDelete = async (_id: string) => {
    toast("This feature will be available in a future update", {
      description: "Cleaning task management is coming soon"
    });
  };

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
                  setFormData({ task_name: '', description: '', frequency: 'full', periodic_rule: '' });
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
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No cleaning tasks configured yet.</p>
              <p className="text-sm mt-1">This feature will be available in a future update.</p>
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
