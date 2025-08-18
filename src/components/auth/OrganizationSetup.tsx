import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { RoleAssignment, AVAILABLE_ROLES } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OrganizationSetupProps {
  onComplete: () => void;
}

export function OrganizationSetup({ onComplete }: OrganizationSetupProps) {
  const [organizationName, setOrganizationName] = useState('');
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([
    { role: 'practice_manager', name: '', email: '' }
  ]);
  const [loading, setLoading] = useState(false);

  const addRoleAssignment = () => {
    setRoleAssignments([...roleAssignments, { role: '', name: '', email: '' }]);
  };

  const removeRoleAssignment = (index: number) => {
    if (roleAssignments.length > 1) {
      setRoleAssignments(roleAssignments.filter((_, i) => i !== index));
    }
  };

  const updateRoleAssignment = (index: number, field: keyof RoleAssignment, value: string) => {
    const updated = [...roleAssignments];
    updated[index] = { ...updated[index], [field]: value };
    setRoleAssignments(updated);
  };

  const getAvailableRoles = (currentIndex: number) => {
    // Allow all roles since we now support multiple roles per person
    return AVAILABLE_ROLES;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!organizationName.trim()) {
      toast({
        title: "Organization name required",
        description: "Please enter your organization name",
        variant: "destructive",
      });
      return;
    }

    const invalidAssignments = roleAssignments.filter(
      assignment => !assignment.role || !assignment.name.trim() || !assignment.email.trim()
    );

    if (invalidAssignments.length > 0) {
      toast({
        title: "Incomplete role assignments",
        description: "Please fill in all role assignments completely",
        variant: "destructive",
      });
      return;
    }

    // Allow duplicate roles since one person can have multiple roles
    // No validation needed for duplicates anymore

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create practice
      const { data: practice, error: practiceError } = await supabase
        .from('practices')
        .insert({
          name: organizationName.trim()
        })
        .select()
        .single();

      if (practiceError) throw practiceError;

      // Create current user record (practice manager)
      const currentUserAssignment = roleAssignments.find(a => a.role === 'practice_manager');
      if (!currentUserAssignment) throw new Error('Practice manager role is required');

      const { error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: user.id,
          email: user.email!,
          name: currentUserAssignment.name,
          role: 'practice_manager',
          practice_id: practice.id,
          is_practice_manager: true
        });

      if (userError) throw userError;

      // Create role assignments
      const { error: rolesError } = await supabase
        .from('role_assignments')
        .insert(
          roleAssignments.map(assignment => ({
            practice_id: practice.id,
            role: assignment.role as any,
            assigned_name: assignment.name,
            assigned_email: assignment.email,
            user_id: assignment.role === 'practice_manager' ? user.id : null
          }))
        );

      if (rolesError) throw rolesError;

      // Mark setup as complete
      const { error: setupError } = await supabase
        .from('organization_setup')
        .insert({
          practice_id: practice.id,
          setup_completed: true
        });

      if (setupError) throw setupError;

      toast({
        title: "Organization setup complete",
        description: "Your practice has been set up successfully",
      });

      onComplete();
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: "Setup failed",
        description: error.message || "Failed to set up organization",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Organization Setup</CardTitle>
            <CardDescription>
              Set up your practice and assign roles to team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization/Practice Name</Label>
                <Input
                  id="orgName"
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Enter your practice name"
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Role Assignments</Label>
                  <div className="text-sm text-muted-foreground">
                    Tip: You can assign multiple roles to the same person
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRoleAssignment}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Role
                  </Button>
                </div>

                {roleAssignments.map((assignment, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                          value={assignment.role}
                          onValueChange={(value) => updateRoleAssignment(index, 'role', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableRoles(index).map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={assignment.name}
                          onChange={(e) => updateRoleAssignment(index, 'name', e.target.value)}
                          placeholder="Full name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={assignment.email}
                          onChange={(e) => updateRoleAssignment(index, 'email', e.target.value)}
                          placeholder="email@example.com"
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        {roleAssignments.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeRoleAssignment(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Setting up...' : 'Complete Setup'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}