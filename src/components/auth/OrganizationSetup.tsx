import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, LogOut, Mail, Calendar } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { AVAILABLE_ROLES } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { RoleEmailAssignment, TaskScheduleConfig, FREQUENCY_OPTIONS, DEFAULT_TASK_TEMPLATES } from '@/types/organizationSetup';

interface OrganizationSetupProps {
  onComplete: () => void;
}

export function OrganizationSetup({ onComplete }: OrganizationSetupProps) {
  const { signOut } = useAuth();
  const [organizationName, setOrganizationName] = useState('');
  const [country, setCountry] = useState<'Wales' | 'England' | 'Scotland'>('England');
  const [roleAssignments, setRoleAssignments] = useState<RoleEmailAssignment[]>([
    { email: '', name: '', password: '', roles: ['practice_manager'] }
  ]);
  
  // Initialize task schedules with tomorrow as default start date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split('T')[0];
  
  const [taskSchedules, setTaskSchedules] = useState<TaskScheduleConfig[]>(
    DEFAULT_TASK_TEMPLATES.map(template => ({
      templateName: template.name,
      responsibleRole: template.responsible_role,
      frequency: template.default_frequency,
      startDate: tomorrowISO,
      slaHours: template.default_sla_hours,
    }))
  );
  
  const [loading, setLoading] = useState(false);

  const addRoleAssignment = () => {
    setRoleAssignments([...roleAssignments, { email: '', name: '', password: '', roles: [] }]);
  };

  const removeRoleAssignment = (index: number) => {
    if (roleAssignments.length > 1) {
      setRoleAssignments(roleAssignments.filter((_, i) => i !== index));
    }
  };

  const updateRoleAssignment = (index: number, field: keyof RoleEmailAssignment, value: any) => {
    const updated = [...roleAssignments];
    updated[index] = { ...updated[index], [field]: value };
    setRoleAssignments(updated);
  };

  const toggleRole = (assignmentIndex: number, roleValue: string) => {
    const updated = [...roleAssignments];
    const assignment = updated[assignmentIndex];
    
    if (assignment.roles.includes(roleValue)) {
      // Remove role (but don't allow removing practice_manager if it's the only one)
      if (roleValue === 'practice_manager') {
        const hasPM = roleAssignments.some((a, i) => 
          i !== assignmentIndex && a.roles.includes('practice_manager') && a.name && a.email
        );
        if (!hasPM) {
          toast({
            title: "Cannot remove Practice Manager",
            description: "At least one person must be assigned as Practice Manager",
            variant: "destructive",
          });
          return;
        }
      }
      assignment.roles = assignment.roles.filter(r => r !== roleValue);
    } else {
      assignment.roles = [...assignment.roles, roleValue];
    }
    
    setRoleAssignments(updated);
  };

  const updateTaskSchedule = (index: number, field: keyof TaskScheduleConfig, value: any) => {
    const updated = [...taskSchedules];
    updated[index] = { ...updated[index], [field]: value };
    setTaskSchedules(updated);
  };

  const handleExit = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/';
    }
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

    // Filter out empty assignments
    const filledAssignments = roleAssignments.filter(
      a => a.name.trim() && a.email.trim() && a.password.trim() && a.roles.length > 0
    );

    if (filledAssignments.length === 0) {
      toast({
        title: "No role assignments",
        description: "Please assign at least one person with roles",
        variant: "destructive",
      });
      return;
    }

    // Ensure at least one practice manager
    const hasPracticeManager = filledAssignments.some(a => a.roles.includes('practice_manager'));
    if (!hasPracticeManager) {
      toast({
        title: "Practice Manager required",
        description: "Please assign at least one person as Practice Manager",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create practice with country
      const { data: practice, error: practiceError } = await supabase
        .from('practices')
        .insert({ 
          name: organizationName.trim(),
          audit_country: country
        })
        .select()
        .single();

      if (practiceError) throw practiceError;

      // Find the current user's assignment
      const currentUserAssignment = filledAssignments.find(a => a.email === user.email);
      const isPracticeManager = currentUserAssignment?.roles.includes('practice_manager') || false;

      // Create or update current user
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      let currentUserId: string;

      if (existingUser) {
        const { data: updated, error: updateError } = await supabase
          .from('users')
          .update({
            name: currentUserAssignment?.name || 'Practice Manager',
            role: currentUserAssignment?.roles[0] as any || 'practice_manager',
            practice_id: practice.id,
            is_practice_manager: isPracticeManager
          })
          .eq('auth_user_id', user.id)
          .select('id')
          .single();

        if (updateError) throw updateError;
        currentUserId = updated.id;
      } else {
        const { data: created, error: createError } = await (supabase as any)
          .from('users')
          .insert({
            auth_user_id: user.id,
            name: currentUserAssignment?.name || 'Practice Manager',
            practice_id: practice.id,
            is_practice_manager: isPracticeManager
          })
          .select('id')
          .single();

        if (createError) throw createError;
        currentUserId = created.id;

        // Insert contact details separately
        const { error: contactError } = await (supabase as any)
          .from('user_contact_details')
          .insert({
            user_id: currentUserId,
            email: user.email!
          });

        if (contactError) {
          console.error('Error creating contact details:', contactError);
          // Don't fail the whole process, contact can be added later
        }
      }

      // Create user accounts for other team members
      const otherAssignments = filledAssignments.filter(a => a.email !== user.email);
      const createdUserIds: Record<string, string> = { [user.email!]: currentUserId };

      for (const assignment of otherAssignments) {
        try {
          const { data, error } = await supabase.functions.invoke('create-user-accounts', {
            body: {
              email: assignment.email,
              name: assignment.name,
              role: assignment.roles[0], // Primary role
              practice_id: practice.id,
              password: assignment.password
            }
          });

          if (error) throw error;
          
          // Store the created user ID
          if (data?.user_id) {
            createdUserIds[assignment.email] = data.user_id;
          }
        } catch (error) {
          console.error(`Error creating user ${assignment.email}:`, error);
          toast({
            title: "User creation warning",
            description: `Could not create account for ${assignment.email}`,
            variant: "destructive",
          });
        }
      }

      // Create user_roles entries for all role assignments
      const userRolesEntries = [];
      for (const assignment of filledAssignments) {
        const userId = createdUserIds[assignment.email];
        if (userId) {
          for (const role of assignment.roles) {
            userRolesEntries.push({
              user_id: userId,
              role: role as any,
              practice_id: practice.id,
              created_by: currentUserId
            });
          }
        }
      }

      if (userRolesEntries.length > 0) {
        const { error: rolesError } = await supabase
          .from('user_roles')
          .insert(userRolesEntries);

        if (rolesError) {
          console.error('Error creating user roles:', rolesError);
        }
      }

      // Create process templates with scheduling configuration
      const templateInserts = taskSchedules.map(schedule => ({
        practice_id: practice.id,
        name: schedule.templateName,
        responsible_role: schedule.responsibleRole as any,
        frequency: schedule.frequency as any,
        start_date: schedule.startDate,
        sla_hours: schedule.slaHours,
        custom_frequency: FREQUENCY_OPTIONS.find(f => f.value === schedule.frequency)?.label,
        active: true,
        steps: [], // Add default steps if needed
      }));

      const { data: createdTemplates, error: templatesError } = await supabase
        .from('process_templates')
        .insert(templateInserts)
        .select();

      if (templatesError) {
        console.error('Error creating templates:', templatesError);
        toast({
          title: "Template creation warning",
          description: "Some task templates could not be created",
          variant: "destructive",
        });
      }

      // Create initial process instances for the first occurrence
      if (createdTemplates && createdTemplates.length > 0) {
        const processInstances = [];
        
        for (const template of createdTemplates) {
          // Find all users with the responsible role
          const usersWithRole = filledAssignments.filter(a => 
            a.roles.includes(template.responsible_role) && createdUserIds[a.email]
          );

          // Create one instance per user with that role
          for (const assignment of usersWithRole) {
            const userId = createdUserIds[assignment.email];
            if (!userId) continue;

            // Calculate first due date
            const startDate = new Date(template.start_date);
            const dueDate = startDate;

            processInstances.push({
              template_id: template.id,
              practice_id: practice.id,
              assignee_id: userId,
              status: 'pending',
              period_start: startDate.toISOString(),
              period_end: dueDate.toISOString(),
              due_at: dueDate.toISOString()
            });
          }
        }

        if (processInstances.length > 0) {
          const { error: instancesError } = await supabase
            .from('process_instances')
            .insert(processInstances);

          if (instancesError) {
            console.error('Error creating process instances:', instancesError);
          }
        }
      }

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
        description: `Your practice has been set up with ${filledAssignments.length} team members and ${taskSchedules.length} task templates`,
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Organization Name and Country */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Enter your organization details and select your country</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={country} onValueChange={(value: any) => setCountry(value)}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wales">Wales (HIW)</SelectItem>
                    <SelectItem value="England">England (CQC)</SelectItem>
                    <SelectItem value="Scotland">Scotland (HIS)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  This determines which audit procedures and regulations apply to your practice
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Role Assignments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Member Role Assignments</CardTitle>
                  <CardDescription>
                    Assign email addresses and roles. Each person can have multiple roles.
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addRoleAssignment}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Person
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {roleAssignments.map((assignment, index) => (
                <Card key={index} className="p-4 border-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Team Member {index + 1}</Label>
                      {roleAssignments.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRoleAssignment(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          placeholder="user@example.com"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input
                          type="password"
                          value={assignment.password}
                          onChange={(e) => updateRoleAssignment(index, 'password', e.target.value)}
                          placeholder="Create password"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Roles (select all that apply)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {AVAILABLE_ROLES.map(role => (
                          <div key={role.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${index}-${role.value}`}
                              checked={assignment.roles.includes(role.value)}
                              onCheckedChange={() => toggleRole(index, role.value)}
                            />
                            <label
                              htmlFor={`${index}-${role.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {role.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {assignment.name && assignment.email && assignment.password && assignment.roles.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const subject = encodeURIComponent(`Your ${organizationName || 'Practice'} Account`);
                          const body = encodeURIComponent(`Hello ${assignment.name},

Your account has been set up for ${organizationName || '[Practice]'}.

Email: ${assignment.email}
Password: ${assignment.password}
Roles: ${assignment.roles.map(r => AVAILABLE_ROLES.find(ar => ar.value === r)?.label).join(', ')}

Login at: ${window.location.origin}

Best regards`);
                          window.open(`mailto:${assignment.email}?subject=${subject}&body=${body}`);
                        }}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Send Login Details
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Task Scheduling Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Task Scheduling Configuration</CardTitle>
              <CardDescription>
                Configure frequency, start date, and SLA for each task template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {taskSchedules.map((schedule, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">{schedule.templateName}</Label>
                      <span className="text-sm text-muted-foreground">
                        Assigned to: {AVAILABLE_ROLES.find(r => r.value === schedule.responsibleRole)?.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Frequency</Label>
                        <Select
                          value={schedule.frequency}
                          onValueChange={(value) => updateTaskSchedule(index, 'frequency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCY_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <div className="relative">
                          <Input
                            type="date"
                            value={schedule.startDate}
                            onChange={(e) => updateTaskSchedule(index, 'startDate', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>SLA (hours after scheduled time)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={schedule.slaHours}
                          onChange={(e) => updateTaskSchedule(index, 'slaHours', parseInt(e.target.value) || 24)}
                          placeholder="24"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-between gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleExit}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Exit to Login
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Setting up...' : 'Complete Setup'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
