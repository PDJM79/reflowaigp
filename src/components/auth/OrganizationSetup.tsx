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
  // Initialize with all available roles, empty name/email
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>(
    AVAILABLE_ROLES.map(role => ({ role: role.value, name: '', email: '' }))
  );
  const [loading, setLoading] = useState(false);

  const updateRoleAssignment = (index: number, field: keyof RoleAssignment, value: string) => {
    const updated = [...roleAssignments];
    updated[index] = { ...updated[index], [field]: value };
    setRoleAssignments(updated);
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

    // Only check for filled assignments (allow empty ones to be skipped)
    const filledAssignments = roleAssignments.filter(
      assignment => assignment.name.trim() || assignment.email.trim()
    );

    const invalidAssignments = filledAssignments.filter(
      assignment => !assignment.name.trim() || !assignment.email.trim()
    );

    if (invalidAssignments.length > 0) {
      toast({
        title: "Incomplete role assignments",
        description: "Please complete all started role assignments (both name and email required)",
        variant: "destructive",
      });
      return;
    }

    // Ensure at least practice manager is assigned
    const practiceManagerAssignment = filledAssignments.find(a => a.role === 'practice_manager');
    if (!practiceManagerAssignment) {
      toast({
        title: "Practice Manager required",
        description: "Please assign someone to the Practice Manager role",
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

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (existingUser) {
        // Update existing user to be practice manager
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: practiceManagerAssignment.name,
            role: 'practice_manager',
            practice_id: practice.id,
            is_practice_manager: true
          })
          .eq('auth_user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new user record (practice manager)
        const { error: userError } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            email: user.email!,
            name: practiceManagerAssignment.name,
            role: 'practice_manager',
            practice_id: practice.id,
            is_practice_manager: true
          });

        if (userError) throw userError;
      }

      // Create user accounts for non-practice manager roles
      const nonPracticeManagerAssignments = filledAssignments.filter(
        assignment => assignment.role !== 'practice_manager'
      );

      const createdUsers: string[] = [];
      
      for (const assignment of nonPracticeManagerAssignments) {
        try {
          const response = await fetch('/functions/v1/create-user-accounts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
              email: assignment.email,
              name: assignment.name,
              role: assignment.role,
              practice_id: practice.id
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to create user ${assignment.email}: ${error.error}`);
          }

          const result = await response.json();
          createdUsers.push(result.user_id);
        } catch (error) {
          console.error(`Error creating user ${assignment.email}:`, error);
          toast({
            title: "User creation warning",
            description: `Could not create account for ${assignment.email}. They can be added later.`,
            variant: "destructive",
          });
        }
      }

      // Create role assignments (only for filled ones)
      const { error: rolesError } = await supabase
        .from('role_assignments')
        .insert(
          filledAssignments.map(assignment => ({
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
                    Assign people to roles (leave empty if not needed)
                  </div>
                </div>

                {roleAssignments.map((assignment, index) => {
                  const roleInfo = AVAILABLE_ROLES.find(r => r.value === assignment.role);
                  return (
                    <Card key={assignment.role} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                          <Label className="font-medium">{roleInfo?.label}</Label>
                          <div className="text-sm text-muted-foreground">
                            {assignment.role === 'practice_manager' && '(Required)'}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={assignment.name}
                            onChange={(e) => updateRoleAssignment(index, 'name', e.target.value)}
                            placeholder="Full name"
                            required={assignment.role === 'practice_manager'}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={assignment.email}
                            onChange={(e) => updateRoleAssignment(index, 'email', e.target.value)}
                            placeholder="email@example.com"
                            required={assignment.role === 'practice_manager'}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
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