import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type UserRole = 'practice_manager' | 'administrator' | 'nurse_lead' | 'cd_lead_gp' | 'estates_lead' | 'ig_lead' | 'reception_lead' | 'nurse' | 'hca' | 'gp' | 'reception' | 'auditor' | 'group_manager';

interface RoleAssignment {
  id: string;
  assigned_name: string;
  role: UserRole;
  user_id?: string;
}

interface RoleManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleOptions = [
  { value: 'practice_manager' as const, label: 'Practice Manager' },
  { value: 'group_manager' as const, label: 'Group Manager' },
  { value: 'administrator' as const, label: 'Administrator' },
  { value: 'gp' as const, label: 'GP' },
  { value: 'nurse' as const, label: 'Nurse' },
  { value: 'nurse_lead' as const, label: 'Nurse Lead' },
  { value: 'cd_lead_gp' as const, label: 'CD Lead GP' },
  { value: 'estates_lead' as const, label: 'Estates Lead' },
  { value: 'ig_lead' as const, label: 'IG Lead' },
  { value: 'reception_lead' as const, label: 'Reception Lead' },
  { value: 'hca' as const, label: 'HCA' },
  { value: 'reception' as const, label: 'Reception' },
  { value: 'auditor' as const, label: 'Auditor' }
];

export function RoleManagement({ open, onOpenChange }: RoleManagementProps) {
  const { user } = useAuth();
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [newAssignment, setNewAssignment] = useState({
    name: '',
    email: '',
    role: '' as UserRole | ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Role assignment staged for deletion, awaiting confirmation (destructive).
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    if (open) {
      fetchRoleAssignments();
    }
  }, [user, open]);

  const fetchRoleAssignments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      if (!user.practiceId) {
        console.error('User practice not found');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/practices/${user.practiceId}/role-assignments?detailed=1`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to load role assignments (${res.status})`);
      setRoleAssignments(await res.json() || []);
    } catch (error) {
      console.error('Error fetching role assignments:', error);
      toast.error('Failed to load role assignments');
    } finally {
      setLoading(false);
    }
  };

  const addRoleAssignment = async () => {
    if (!newAssignment.name || !newAssignment.email || !newAssignment.role) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSaving(true);
      
      if (!user?.practiceId) throw new Error('User practice not found');

      // Create the assignment (+ contact email) via the API
      const res = await fetch(`/api/practices/${user.practiceId}/role-assignments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedName: newAssignment.name,
          role: newAssignment.role,
          assignedEmail: newAssignment.email,
        }),
      });
      if (!res.ok) throw new Error(`Failed to add role assignment (${res.status})`);

      toast.success('Role assignment added successfully');
      setNewAssignment({ name: '', email: '', role: '' });
      fetchRoleAssignments();
    } catch (error) {
      console.error('Error adding role assignment:', error);
      toast.error('Failed to add role assignment');
    } finally {
      setSaving(false);
    }
  };

  const deleteRoleAssignment = async (id: string) => {
    try {
      const res = await fetch(`/api/practices/${user!.practiceId}/role-assignments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to delete role assignment (${res.status})`);

      toast.success('Role assignment deleted');
      fetchRoleAssignments();
    } catch (error) {
      console.error('Error deleting role assignment:', error);
      toast.error('Failed to delete role assignment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Role Management</DialogTitle>
          <DialogDescription>
            Manage roles and designations for your practice
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Add New Assignment */}
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-medium">Add New Role Assignment</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newAssignment.name}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newAssignment.email}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={newAssignment.role} onValueChange={(value) => setNewAssignment(prev => ({ ...prev, role: value as UserRole }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={addRoleAssignment} disabled={saving} className="w-full">
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding...
                    </div>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Assignment
                    </>
                  )}
                </Button>
              </div>

              {/* Current Assignments */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Current Role Assignments ({roleAssignments.length})</h3>
                {roleAssignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No role assignments found</p>
                    <p className="text-sm">Add assignments using the form above</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {roleAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="min-w-0">
                              <p className="font-medium truncate">{assignment.assigned_name}</p>
                            </div>
                            <Badge variant="outline">
                              {roleOptions.find(r => r.value === assignment.role)?.label || assignment.role}
                            </Badge>
                            {assignment.user_id && (
                              <Badge variant="secondary">Active User</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDelete({ id: assignment.id, label: `${assignment.assigned_name} — ${roleOptions.find(r => r.value === assignment.role)?.label || assignment.role}` })}
                          className="text-destructive hover:text-destructive flex-shrink-0 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this role assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.label} will be removed. This changes who holds this role and is recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); if (pendingDelete) deleteRoleAssignment(pendingDelete.id); setPendingDelete(null); }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
