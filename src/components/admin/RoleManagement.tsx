import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, Save, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BackButton } from '@/components/ui/back-button';

type UserRole = 'practice_manager' | 'administrator' | 'nurse_lead' | 'cd_lead_gp' | 'estates_lead' | 'ig_lead' | 'reception_lead' | 'nurse' | 'hca' | 'gp' | 'reception' | 'auditor' | 'group_manager';

interface UserWithRole {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isPracticeManager: boolean;
}

interface RoleManagementProps {
  onClose: () => void;
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

export function RoleManagement({ onClose }: RoleManagementProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [newAssignment, setNewAssignment] = useState({
    name: '',
    email: '',
    role: '' as UserRole | ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    if (!user?.practiceId) return;

    try {
      const response = await fetch(`/api/practices/${user.practiceId}/users`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const addUser = async () => {
    if (!newAssignment.name || !newAssignment.email || !newAssignment.role) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!user?.practiceId) return;

    try {
      setSaving(true);

      const response = await fetch(`/api/practices/${user.practiceId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newAssignment.name,
          email: newAssignment.email,
          role: newAssignment.role,
        }),
      });

      if (!response.ok) throw new Error('Failed to add user');

      toast.success('User added successfully');
      setNewAssignment({ name: '', email: '', role: '' });
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    } finally {
      setSaving(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!user?.practiceId) return;

    try {
      const response = await fetch(`/api/practices/${user.practiceId}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error('Failed to update role');

      toast.success('Role updated successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-center" data-testid="loading-spinner">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0 sticky top-0 bg-card z-10 border-b">
          <div className="flex items-center gap-4">
            <BackButton fallbackPath="/dashboard" />
            <div className="flex-1">
              <CardTitle>Role Management</CardTitle>
              <CardDescription>
                Manage roles and designations for your practice
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-role-management">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent className="space-y-6 p-6">
          {/* Add New User */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium">Add New User</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  data-testid="input-user-name"
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
                  data-testid="input-user-email"
                  value={newAssignment.email}
                  onChange={(e) => setNewAssignment(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={newAssignment.role} onValueChange={(value) => setNewAssignment(prev => ({ ...prev, role: value as UserRole }))}>
                  <SelectTrigger data-testid="select-user-role">
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
            <Button onClick={addUser} disabled={saving} className="w-full" data-testid="button-add-user">
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Adding...
                </div>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </>
              )}
            </Button>
          </div>

          {/* Current Users */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium" data-testid="text-user-count">Current Users ({users.length})</h3>
            {users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-users">
                <p>No users found</p>
                <p className="text-sm">Add users using the form above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors" data-testid={`row-user-${u.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-medium truncate" data-testid={`text-user-name-${u.id}`}>{u.name}</p>
                          <p className="text-sm text-muted-foreground truncate" data-testid={`text-user-email-${u.id}`}>{u.email}</p>
                        </div>
                        <Select
                          value={u.role}
                          onValueChange={(value) => updateUserRole(u.id, value as UserRole)}
                        >
                          <SelectTrigger className="w-[180px]" data-testid={`select-role-${u.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {u.isPracticeManager && (
                          <Badge variant="secondary">Manager</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}
