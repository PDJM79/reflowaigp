import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface TeamUser { id: string; name: string; isActive?: boolean }

interface AssignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
  task: { id: string; title: string; assigneeId?: string | null } | null;
}

/**
 * Assign or reassign a task occurrence. "Assign to me" always works for an
 * unassigned occurrence; reassigning an occupied task is enforced manager-only
 * on the server (a 403 is surfaced as a toast).
 */
export function AssignDialog({ isOpen, onClose, onAssigned, task }: AssignDialogProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !user?.practiceId) return;
    setSelected(task?.assigneeId ?? '');
    fetch(`/api/practices/${user.practiceId}/users`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((u) => setUsers(Array.isArray(u) ? u.filter((x: any) => x.isActive !== false) : []))
      .catch(() => setUsers([]));
  }, [isOpen, user?.practiceId, task]);

  const post = async (body: Record<string, unknown>) => {
    if (!task || !user?.practiceId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/practices/${user.practiceId}/tasks/${task.id}/assign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(typeof err?.error === 'string' ? err.error : 'Failed to assign');
      }
      toast.success('Task assigned');
      onAssigned();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign task');
    } finally {
      setSaving(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle>Assign task</DialogTitle>
          <DialogDescription className="truncate">{task.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="secondary" className="w-full" disabled={saving}
            onClick={() => post({ assignToMe: true })}>
            <UserCheck className="h-4 w-4 mr-2" /> Assign to me
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or a team member</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Team member</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue placeholder="Choose a person" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button disabled={saving || !selected} className="w-full sm:w-auto"
            onClick={() => post({ assigneeId: selected })}>
            {saving ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
