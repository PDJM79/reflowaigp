import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Settings, Plus, Pencil, Trash2, Loader2, MapPin, ClipboardList, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { ZoneTypeIcon } from '@/components/cleaning/ZoneTypeIcon';

interface Zone {
  id: string;
  zoneName: string;
  zoneType: string | null;
  description: string | null;
  isActive: boolean;
}

interface Task {
  id: string;
  taskName: string;
  zoneId: string | null;
  frequency: string;
  description: string | null;
  requiresPhoto: boolean;
  isActive: boolean;
}

const ZONE_TYPES = ['clinical', 'admin', 'common', 'utility', 'toilet', 'staff', 'office', 'kitchen', 'corridor', 'other'];
const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'twice_daily', label: 'Twice Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'periodic', label: 'Periodic' },
];

export default function CleaningManage() {
  const { user } = useAuth();
  const { hasAnyCapability } = useCapabilities();
  const navigate = useNavigate();
  const isManager = hasAnyCapability('manage_cleaning', 'assign_roles', 'configure_practice');

  const [zones, setZones] = useState<Zone[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Zone dialog state
  const [zoneDialog, setZoneDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [zoneForm, setZoneForm] = useState({ zoneName: '', zoneType: 'other', description: '' });
  const [savingZone, setSavingZone] = useState(false);

  // Task dialog state
  const [taskDialog, setTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({ taskName: '', zoneId: '', frequency: 'daily', description: '', requiresPhoto: false });
  const [savingTask, setSavingTask] = useState(false);

  // Delete confirmations
  const [deleteZoneId, setDeleteZoneId] = useState<string | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user?.practiceId) return;
    try {
      const [zRes, tRes] = await Promise.all([
        fetch(`/api/practices/${user.practiceId}/cleaning-zones`, { credentials: 'include' }),
        fetch(`/api/practices/${user.practiceId}/cleaning-tasks`, { credentials: 'include' }),
      ]);
      if (zRes.ok) setZones(await zRes.json());
      if (tRes.ok) setTasks(await tRes.json());
    } catch (e) {
      toast.error('Failed to load cleaning data');
    } finally {
      setLoading(false);
    }
  };

  // Zone CRUD
  const openAddZone = () => {
    setEditingZone(null);
    setZoneForm({ zoneName: '', zoneType: 'other', description: '' });
    setZoneDialog(true);
  };
  const openEditZone = (z: Zone) => {
    setEditingZone(z);
    setZoneForm({ zoneName: z.zoneName, zoneType: z.zoneType || 'other', description: z.description || '' });
    setZoneDialog(true);
  };
  const saveZone = async () => {
    if (!zoneForm.zoneName.trim()) { toast.error('Zone name required'); return; }
    setSavingZone(true);
    try {
      const url = editingZone
        ? `/api/practices/${user!.practiceId}/cleaning-zones/${editingZone.id}`
        : `/api/practices/${user!.practiceId}/cleaning-zones`;
      const method = editingZone ? 'PUT' : 'POST';
      const res = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(zoneForm) });
      if (!res.ok) throw new Error(await res.text());
      toast.success(editingZone ? 'Zone updated' : 'Zone created');
      setZoneDialog(false);
      fetchData();
    } catch (e) {
      toast.error('Failed to save zone');
    } finally {
      setSavingZone(false);
    }
  };
  const deleteZone = async (id: string) => {
    try {
      const res = await fetch(`/api/practices/${user!.practiceId}/cleaning-zones/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
      toast.success('Zone deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete zone');
    } finally {
      setDeleteZoneId(null);
    }
  };

  // Task CRUD
  const openAddTask = () => {
    setEditingTask(null);
    setTaskForm({ taskName: '', zoneId: '', frequency: 'daily', description: '', requiresPhoto: false });
    setTaskDialog(true);
  };
  const openEditTask = (t: Task) => {
    setEditingTask(t);
    setTaskForm({ taskName: t.taskName, zoneId: t.zoneId || '', frequency: t.frequency, description: t.description || '', requiresPhoto: t.requiresPhoto || false });
    setTaskDialog(true);
  };
  const saveTask = async () => {
    if (!taskForm.taskName.trim()) { toast.error('Task name required'); return; }
    setSavingTask(true);
    try {
      const body = { ...taskForm, zoneId: taskForm.zoneId || null };
      const url = editingTask
        ? `/api/practices/${user!.practiceId}/cleaning-tasks/${editingTask.id}`
        : `/api/practices/${user!.practiceId}/cleaning-tasks`;
      const method = editingTask ? 'PUT' : 'POST';
      const res = await fetch(url, { method, credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      toast.success(editingTask ? 'Task updated' : 'Task created');
      setTaskDialog(false);
      fetchData();
    } catch (e) {
      toast.error('Failed to save task');
    } finally {
      setSavingTask(false);
    }
  };
  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/practices/${user!.practiceId}/cleaning-tasks/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
      toast.success('Task deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setDeleteTaskId(null);
    }
  };

  const activeZones = zones.filter(z => z.isActive);
  const activeTasks = tasks.filter(t => t.isActive);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Manage Zones & Tasks
          </h1>
          <p className="text-sm text-muted-foreground">Configure cleaning zones and task library</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <Tabs defaultValue="zones">
          <TabsList>
            <TabsTrigger value="zones">
              <MapPin className="h-4 w-4 mr-2" />
              Zones ({activeZones.length})
            </TabsTrigger>
            <TabsTrigger value="tasks">
              <ClipboardList className="h-4 w-4 mr-2" />
              Tasks ({activeTasks.length})
            </TabsTrigger>
          </TabsList>

          {/* ZONES TAB */}
          <TabsContent value="zones" className="space-y-4 mt-4">
            {isManager && (
              <Button onClick={openAddZone}>
                <Plus className="h-4 w-4 mr-2" /> Add Zone
              </Button>
            )}
            {activeZones.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No zones configured yet. Add your first zone.</CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeZones.map(zone => (
                  <Card key={zone.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <ZoneTypeIcon type={zone.zoneType} className="h-4 w-4 text-muted-foreground" />
                          <CardTitle className="text-base">{zone.zoneName}</CardTitle>
                        </div>
                        {isManager && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditZone(zone)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteZoneId(zone.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1">
                      {zone.zoneType && <Badge variant="outline" className="text-xs capitalize">{zone.zoneType}</Badge>}
                      {zone.description && <p className="text-xs text-muted-foreground">{zone.description}</p>}
                      <p className="text-xs text-muted-foreground">
                        {activeTasks.filter(t => t.zoneId === zone.id).length} tasks
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TASKS TAB */}
          <TabsContent value="tasks" className="space-y-4 mt-4">
            {isManager && (
              <Button onClick={openAddTask}>
                <Plus className="h-4 w-4 mr-2" /> Add Task
              </Button>
            )}
            {activeTasks.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No tasks configured yet.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {activeZones.map(zone => {
                  const zoneTasks = activeTasks.filter(t => t.zoneId === zone.id);
                  if (zoneTasks.length === 0) return null;
                  return (
                    <Card key={zone.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <ZoneTypeIcon type={zone.zoneType} className="h-4 w-4" />
                          {zone.zoneName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 divide-y">
                        {zoneTasks.map(task => (
                          <div key={task.id} className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{task.taskName}</p>
                                  {task.requiresPhoto && <Camera className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                                </div>
                                {task.description && <p className="text-xs text-muted-foreground truncate">{task.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <Badge variant="secondary" className="text-xs capitalize">{task.frequency.replace('_', ' ')}</Badge>
                              {isManager && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTask(task)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTaskId(task.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
                {/* Unassigned tasks */}
                {activeTasks.filter(t => !t.zoneId).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 divide-y">
                      {activeTasks.filter(t => !t.zoneId).map(task => (
                        <div key={task.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <p className="text-sm font-medium">{task.taskName}</p>
                            {task.requiresPhoto && <Camera className="h-3 w-3 text-blue-500" />}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="text-xs capitalize">{task.frequency.replace('_', ' ')}</Badge>
                            {isManager && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditTask(task)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTaskId(task.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Zone Dialog */}
      <Dialog open={zoneDialog} onOpenChange={setZoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Zone' : 'Add Zone'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Zone Name *</Label>
              <Input value={zoneForm.zoneName} onChange={e => setZoneForm(f => ({ ...f, zoneName: e.target.value }))} placeholder="e.g. Reception Area" />
            </div>
            <div>
              <Label>Zone Type</Label>
              <Select value={zoneForm.zoneType} onValueChange={v => setZoneForm(f => ({ ...f, zoneType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ZONE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={zoneForm.description} onChange={e => setZoneForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes about this zone" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZoneDialog(false)}>Cancel</Button>
            <Button onClick={saveZone} disabled={savingZone}>
              {savingZone && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingZone ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task Name *</Label>
              <Input value={taskForm.taskName} onChange={e => setTaskForm(f => ({ ...f, taskName: e.target.value }))} placeholder="e.g. Wipe down surfaces" />
            </div>
            <div>
              <Label>Zone</Label>
              <Select value={taskForm.zoneId || 'none'} onValueChange={v => setTaskForm(f => ({ ...f, zoneId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="No zone (unassigned)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No zone</SelectItem>
                  {activeZones.map(z => <SelectItem key={z.id} value={z.id}>{z.zoneName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={taskForm.frequency} onValueChange={v => setTaskForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional instructions" rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="requiresPhoto" checked={taskForm.requiresPhoto} onChange={e => setTaskForm(f => ({ ...f, requiresPhoto: e.target.checked }))} className="h-4 w-4" />
              <Label htmlFor="requiresPhoto" className="cursor-pointer">Requires photo evidence</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialog(false)}>Cancel</Button>
            <Button onClick={saveTask} disabled={savingTask}>
              {savingTask && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTask ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Zone Confirm */}
      <AlertDialog open={!!deleteZoneId} onOpenChange={open => !open && setDeleteZoneId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Zone?</AlertDialogTitle>
            <AlertDialogDescription>This will deactivate the zone. Existing logs will be kept.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteZoneId && deleteZone(deleteZoneId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Task Confirm */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={open => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>This will deactivate the task. Existing logs will be kept.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteTaskId && deleteTask(deleteTaskId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
