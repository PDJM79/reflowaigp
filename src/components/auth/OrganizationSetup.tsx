import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, LogOut, Mail, Calendar, Loader2 } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { RoleEmailAssignment, TaskScheduleConfig, FREQUENCY_OPTIONS, DEFAULT_TASK_TEMPLATES } from '@/types/organizationSetup';
import { ROLE_CATEGORY_LABELS, RoleCategory, RoleCatalogEntry } from '@/types/roles';

interface OrganizationSetupProps {
  onComplete: () => void;
}

export function OrganizationSetup({ onComplete }: OrganizationSetupProps) {
  const { user, signOut } = useAuth();
  const [organizationName, setOrganizationName] = useState('');
  const [country, setCountry] = useState<'Wales' | 'England' | 'Scotland'>('England');
  const [roleAssignments, setRoleAssignments] = useState<RoleEmailAssignment[]>([
    { email: '', name: '', password: '', roles: ['practice_manager'] }
  ]);
  
  // Role catalog state
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogEntry[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  
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

  // Fetch role catalog on mount
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/role-catalog', { credentials: 'include' });
        if (!res.ok) throw new Error(`Failed to load roles (${res.status})`);
        const data = await res.json() as any[];
        setRoleCatalog(data.map((r) => ({
          ...r,
          category: r.category as RoleCategory,
          default_capabilities: r.default_capabilities ?? [],
          created_at: r.created_at ?? '',
          updated_at: r.updated_at ?? '',
        })));
      } catch (err) {
        console.error('Error fetching role catalog:', err);
        toast({
          title: "Failed to load roles",
          description: "Using default role set",
          variant: "destructive",
        });
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, []);

  // Group roles by category
  const rolesByCategory = useMemo(() => {
    const grouped: Record<RoleCategory, RoleCatalogEntry[]> = {
      clinical: [],
      admin: [],
      governance: [],
      it: [],
      support: [],
      pcn: [],
    };
    
    roleCatalog.forEach(role => {
      if (grouped[role.category]) {
        grouped[role.category].push(role);
      }
    });
    
    return grouped;
  }, [roleCatalog]);

  // Helper to get role label
  const getRoleLabel = (roleKey: string): string => {
    return roleCatalog.find(r => r.role_key === roleKey)?.display_name || roleKey;
  };

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
      if (!user) throw new Error('No user found');

      // Provision the whole practice server-side (see docs/ORGSETUP_MAP.md).
      const res = await fetch('/api/setup/provision', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          country,
          assignments: filledAssignments.map((a) => ({
            email: a.email, name: a.name, roles: a.roles, password: a.password,
          })),
          taskSchedules: taskSchedules.map((s) => ({
            templateName: s.templateName, responsibleRole: s.responsibleRole,
            frequency: s.frequency, startDate: s.startDate, slaHours: s.slaHours,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to set up organization');
      }

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

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Roles (select all that apply)</Label>
                      {rolesLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading roles...</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(Object.entries(rolesByCategory) as [RoleCategory, RoleCatalogEntry[]][])
                            .filter(([_, roles]) => roles.length > 0)
                            .map(([category, roles]) => (
                              <div key={category} className="space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                                  {ROLE_CATEGORY_LABELS[category]}
                                </Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {roles.map(role => (
                                    <div key={role.role_key} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`${index}-${role.role_key}`}
                                        checked={assignment.roles.includes(role.role_key)}
                                        onCheckedChange={() => toggleRole(index, role.role_key)}
                                      />
                                      <label
                                        htmlFor={`${index}-${role.role_key}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                      >
                                        {role.display_name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
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
Roles: ${assignment.roles.map(r => getRoleLabel(r)).join(', ')}

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
                        Assigned to: {getRoleLabel(schedule.responsibleRole)}
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
