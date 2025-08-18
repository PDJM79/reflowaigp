import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type UserRole = 'practice_manager' | 'nurse_lead' | 'cd_lead_gp' | 'estates_lead' | 'ig_lead' | 'reception_lead' | 'nurse' | 'hca' | 'gp' | 'reception' | 'auditor';

interface RoleAssignment {
  id: string;
  assigned_name: string;
  assigned_email: string;
  role: UserRole;
  user_id?: string;
}

interface RoleManagementProps {
  onClose: () => void;
}

const roleOptions = [
  { value: 'practice_manager' as const, label: 'Practice Manager' },
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
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [newAssignment, setNewAssignment] = useState({
    name: '',
    email: '',
    role: '' as UserRole | ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoleAssignments();
  }, [user]);

  const fetchRoleAssignments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('role_assignments')
        .select('*')
        .order('assigned_name');

      if (error) throw error;
      setRoleAssignments(data || []);
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
      
      // Get user's practice ID
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User practice not found');

      const { error } = await supabase
        .from('role_assignments')
        .insert({
          assigned_name: newAssignment.name,
          assigned_email: newAssignment.email,
          role: newAssignment.role as UserRole,
          practice_id: userData.practice_id
        });

      if (error) throw error;

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
      const { error } = await supabase
        .from('role_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Role assignment deleted');
      fetchRoleAssignments();
    } catch (error) {
      console.error('Error deleting role assignment:', error);
      toast.error('Failed to delete role assignment');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>
                Manage roles and designations for your practice
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
            <h3 className="text-sm font-medium">Current Role Assignments</h3>
            {roleAssignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No role assignments found</p>
                <p className="text-sm">Add assignments using the form above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {roleAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{assignment.assigned_name}</p>
                          <p className="text-sm text-muted-foreground">{assignment.assigned_email}</p>
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
                      onClick={() => deleteRoleAssignment(assignment.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}