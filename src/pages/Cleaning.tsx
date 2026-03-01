import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplet, Loader2, RefreshCw, CheckCircle2, Circle, Settings, Camera, AlertTriangle, Image } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { triggerHaptic } from '@/lib/haptics';
import { ZoneTypeIcon } from '@/components/cleaning/ZoneTypeIcon';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CleaningZone {
  id: string;
  zoneName: string;
  zoneType: string | null;
  isActive: boolean;
}

interface CleaningTask {
  id: string;
  taskName: string;
  description: string | null;
  frequency: string;
  zoneId: string | null;
  requiresPhoto: boolean;
  isActive: boolean;
}

interface CleaningLog {
  id: string;
  taskId: string | null;
  zoneId: string | null;
  completedAt: string | null;
  initials: string | null;
  notes: string | null;
  photoUrl: string | null;
  hasIssue: boolean;
  issueDescription: string | null;
  completedBy: string | null;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  twice_daily: '2x Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  periodic: 'Periodic',
};

export default function Cleaning() {
  const { user } = useAuth();
  const { hasAnyCapability } = useCapabilities();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const isManager = hasAnyCapability('manage_cleaning', 'assign_roles', 'configure_practice');

  const [zones, setZones] = useState<CleaningZone[]>([]);
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [todayLogs, setTodayLogs] = useState<CleaningLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Completion dialog state
  const [completeDialog, setCompleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CleaningTask | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [hasIssue, setHasIssue] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('schedule');

  const { scrollableRef, isPulling, pullProgress, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await fetchCleaningData();
      triggerHaptic('success');
    },
    enabled: isMobile,
  });

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    fetchCleaningData();
  }, [user, navigate]);

  const fetchCleaningData = async () => {
    if (!user?.practiceId) { setLoading(false); return; }
    try {
      const today = new Date().toISOString().split('T')[0];
      const [zRes, tRes, lRes] = await Promise.all([
        fetch(`/api/practices/${user.practiceId}/cleaning-zones`, { credentials: 'include' }),
        fetch(`/api/practices/${user.practiceId}/cleaning-tasks`, { credentials: 'include' }),
        fetch(`/api/practices/${user.practiceId}/cleaning-logs?date=${today}`, { credentials: 'include' }),
      ]);
      if (zRes.ok) setZones(await zRes.json());
      if (tRes.ok) setTasks(await tRes.json());
      if (lRes.ok) setTodayLogs(await lRes.json());
    } catch (error) {
      toast.error('Failed to load cleaning data');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: CleaningTask) => {
    if (isTaskDone(task.id)) return;
    setSelectedTask(task);
    setCompletionNotes('');
    setHasIssue(false);
    setIssueDescription('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setCompleteDialog(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (file: File, taskId: string): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user!.practiceId}/${taskId}_${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('cleaning-photos').upload(path, file, { upsert: true });
      if (error) { console.warn('Photo upload failed:', error.message); return null; }
      const { data: urlData } = supabase.storage.from('cleaning-photos').getPublicUrl(data.path);
      return urlData.publicUrl;
    } catch {
      return null;
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask || !user?.practiceId) return;
    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile, selectedTask.id);
      }

      const nameParts = (user.name || user.email || '?').trim().split(' ');
      const initials = nameParts.length >= 2
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : nameParts[0].substring(0, 2).toUpperCase();

      const body = {
        taskId: selectedTask.id,
        zoneId: selectedTask.zoneId || null,
        notes: completionNotes || null,
        photoUrl,
        hasIssue,
        issueDescription: hasIssue ? issueDescription : null,
        initials,
        completedBy: user.id,
      };

      const res = await fetch(`/api/practices/${user.practiceId}/cleaning-logs`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to complete task');
      }

      toast.success(`${selectedTask.taskName} marked complete`);
      triggerHaptic('success');
      setCompleteDialog(false);
      await fetchCleaningData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete task');
    } finally {
      setSubmitting(false);
    }
  };

  const isTaskDone = (taskId: string) => todayLogs.some(l => l.taskId === taskId && l.completedAt);
  const getTaskLog = (taskId: string) => todayLogs.find(l => l.taskId === taskId && l.completedAt);

  const activeTasks = tasks.filter(t => t.isActive !== false);
  const completedIds = new Set(todayLogs.filter(l => l.completedAt).map(l => l.taskId));

  const tasksByZone = zones
    .filter(z => z.isActive !== false)
    .map(zone => ({
      zone,
      tasks: activeTasks.filter(t => t.zoneId === zone.id),
    }))
    .filter(g => g.tasks.length > 0);

  const unassignedTasks = activeTasks.filter(t => !t.zoneId);
  const completedToday = activeTasks.filter(t => completedIds.has(t.id)).length;
  const issueCount = todayLogs.filter(l => l.hasIssue).length;
  const photosToday = todayLogs.filter(l => l.photoUrl);

  const renderTaskRow = (task: CleaningTask) => {
    const done = isTaskDone(task.id);
    const log = getTaskLog(task.id);
    return (
      <div
        key={task.id}
        className={`flex items-center gap-3 py-3 ${!done ? 'cursor-pointer hover:bg-accent/30 rounded px-2 -mx-2 transition-colors' : 'px-2 -mx-2'}`}
        onClick={() => !done && handleTaskClick(task)}
      >
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>
              {task.taskName}
            </p>
            {task.requiresPhoto && !done && (
              <Camera className="h-3 w-3 text-blue-500 flex-shrink-0" title="Photo required" />
            )}
            {done && log?.hasIssue && (
              <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" title="Issue flagged" />
            )}
            {done && log?.photoUrl && (
              <Image className="h-3 w-3 text-green-600 flex-shrink-0" title="Photo attached" />
            )}
          </div>
          {task.description && !done && (
            <p className="text-xs text-muted-foreground truncate">{task.description}</p>
          )}
          {done && log && (
            <p className="text-xs text-muted-foreground">
              Completed by {log.initials || 'user'} at {log.completedAt ? format(new Date(log.completedAt), 'HH:mm') : '-'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="secondary" className="text-xs hidden sm:flex">
            {FREQUENCY_LABELS[task.frequency] || task.frequency}
          </Badge>
          {!done && (
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={e => { e.stopPropagation(); handleTaskClick(task); }}>
              Complete
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={scrollableRef} className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
      {isMobile && (isPulling || isRefreshing) && (
        <div className="flex items-center justify-center py-4 transition-opacity" style={{ opacity: isPulling ? pullProgress : 1 }}>
          {isRefreshing ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : (
            <RefreshCw className="h-6 w-6 text-primary transition-transform" style={{ transform: `rotate(${pullProgress * 360}deg)` }} />
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Droplet className="h-6 w-6 sm:h-8 sm:w-8" />
              {t('cleaning.title')}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Today's cleaning schedule — {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {isManager && (
          <Button variant="outline" size={isMobile ? 'lg' : 'default'} className="min-h-[44px]" onClick={() => navigate('/cleaning/manage')}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Zones & Tasks
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-4 sm:gap-4">
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3"><CardTitle className="text-xs sm:text-sm font-medium">Zones</CardTitle></CardHeader>
          <CardContent><div className="text-2xl sm:text-3xl font-bold">{zones.filter(z => z.isActive !== false).length}</div></CardContent>
        </Card>
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3"><CardTitle className="text-xs sm:text-sm font-medium">Due Today</CardTitle></CardHeader>
          <CardContent><div className="text-2xl sm:text-3xl font-bold">{activeTasks.length}</div></CardContent>
        </Card>
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3"><CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl sm:text-3xl font-bold ${completedToday === activeTasks.length && activeTasks.length > 0 ? 'text-green-600' : ''}`}>
              {completedToday}/{activeTasks.length}
            </div>
          </CardContent>
        </Card>
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3"><CardTitle className="text-xs sm:text-sm font-medium">Issues</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl sm:text-3xl font-bold ${issueCount > 0 ? 'text-orange-500' : ''}`}>
              {issueCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : zones.filter(z => z.isActive !== false).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Droplet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium mb-2">No cleaning zones configured</p>
            <p className="text-sm text-muted-foreground mb-4">Add zones and tasks to see today's cleaning schedule here.</p>
            {isManager && (
              <Button onClick={() => navigate('/cleaning/manage')}>
                <Settings className="h-4 w-4 mr-2" />Manage Zones & Tasks
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        isManager ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="photos">
                Photo Evidence {photosToday.length > 0 && <Badge className="ml-2 text-xs">{photosToday.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule">
              <CleaningScheduleView
                tasksByZone={tasksByZone}
                unassignedTasks={unassignedTasks}
                renderTaskRow={renderTaskRow}
                completedIds={completedIds}
              />
            </TabsContent>

            <TabsContent value="photos" className="mt-4 space-y-4">
              {photosToday.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No photo evidence submitted today</CardContent></Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {photosToday.map(log => {
                    const task = tasks.find(t => t.id === log.taskId);
                    const zone = zones.find(z => z.id === log.zoneId);
                    return (
                      <Card key={log.id}>
                        <CardContent className="p-3">
                          <img src={log.photoUrl!} alt="Cleaning evidence" className="w-full h-48 object-cover rounded mb-2" />
                          <p className="text-sm font-medium">{task?.taskName || 'Unknown task'}</p>
                          <p className="text-xs text-muted-foreground">{zone?.zoneName || 'Unknown zone'}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.completedAt ? format(new Date(log.completedAt), 'HH:mm') : ''} by {log.initials}
                          </p>
                          {log.hasIssue && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Issue: {log.issueDescription}
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <CleaningScheduleView
            tasksByZone={tasksByZone}
            unassignedTasks={unassignedTasks}
            renderTaskRow={renderTaskRow}
            completedIds={completedIds}
          />
        )
      )}

      {/* Task Completion Dialog */}
      <Dialog open={completeDialog} onOpenChange={setCompleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedTask && (
              <div className="bg-muted/50 rounded p-3">
                <p className="font-medium">{selectedTask.taskName}</p>
                {selectedTask.description && <p className="text-sm text-muted-foreground mt-1">{selectedTask.description}</p>}
              </div>
            )}

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={completionNotes}
                onChange={e => setCompletionNotes(e.target.value)}
                placeholder="Any notes about this task..."
                rows={2}
              />
            </div>

            <div>
              <Label>Photo Evidence {selectedTask?.requiresPhoto && <span className="text-destructive">*</span>}</Label>
              <div className="mt-2">
                {photoPreview ? (
                  <div className="relative">
                    <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded border" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {isMobile ? 'Take Photo or Choose File' : 'Choose Photo'}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture={isMobile ? 'environment' : undefined}
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasIssue"
                  checked={hasIssue}
                  onChange={e => setHasIssue(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="hasIssue" className="cursor-pointer text-orange-600">Flag an issue</Label>
              </div>
              {hasIssue && (
                <Textarea
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  placeholder="Describe the issue..."
                  rows={2}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCompleteTask}
              disabled={submitting || (selectedTask?.requiresPhoto === true && !photoFile)}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CleaningScheduleView({ tasksByZone, unassignedTasks, renderTaskRow, completedIds }: {
  tasksByZone: Array<{ zone: CleaningZone; tasks: CleaningTask[] }>;
  unassignedTasks: CleaningTask[];
  renderTaskRow: (task: CleaningTask) => React.ReactNode;
  completedIds: Set<string | null>;
}) {
  if (tasksByZone.length === 0 && unassignedTasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <p className="font-medium">No tasks configured</p>
          <p className="text-sm text-muted-foreground">Add tasks via Manage Zones & Tasks.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {tasksByZone.map(({ zone, tasks: zoneTasks }) => {
        const zoneCompleted = zoneTasks.filter(t => completedIds.has(t.id)).length;
        const allDone = zoneCompleted === zoneTasks.length;
        return (
          <Card key={zone.id} className={allDone ? 'border-green-200 dark:border-green-800' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ZoneTypeIcon type={zone.zoneType || 'other'} className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{zone.zoneName}</CardTitle>
                  {zone.zoneType && <Badge variant="outline" className="text-xs capitalize">{zone.zoneType}</Badge>}
                </div>
                <span className="text-sm text-muted-foreground">{zoneCompleted}/{zoneTasks.length} done</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y">
                {zoneTasks.map(task => renderTaskRow(task))}
              </div>
            </CardContent>
          </Card>
        );
      })}
      {unassignedTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">Unassigned Tasks</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y">
              {unassignedTasks.map(task => renderTaskRow(task))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
