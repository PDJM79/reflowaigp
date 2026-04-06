import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, LogOut, Mail, Calendar, Loader2 } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { RoleEmailAssignment, TaskScheduleConfig, FREQUENCY_OPTIONS, DEFAULT_TASK_TEMPLATES } from '@/types/organizationSetup';
import { ROLE_CATEGORY_LABELS, RoleCategory, RoleCatalogEntry } from '@/types/roles';

interface OrganizationSetupProps {
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Module-level pure/async helpers
// ---------------------------------------------------------------------------

function validateSetupForm(
  organizationName: string,
  roleAssignments: RoleEmailAssignment[]
): { error: string | null; filledAssignments: RoleEmailAssignment[] } {
  if (!organizationName.trim()) {
    return { error: 'Organization name required', filledAssignments: [] };
  }
  const filledAssignments = roleAssignments.filter(
    a => a.name.trim() && a.email.trim() && a.password.trim() && a.roles.length > 0
  );
  if (filledAssignments.length === 0) {
    return { error: 'No role assignments', filledAssignments: [] };
  }
  if (!filledAssignments.some(a => a.roles.includes('practice_manager'))) {
    return { error: 'Practice Manager required', filledAssignments: [] };
  }
  return { error: null, filledAssignments };
}

async function createPracticeViaFunction(name: string, country: string) {
  const { data, error } = await supabase.functions.invoke('create-practice-during-setup', {
    body: { name, country },
  });
  if (error || !data?.success) {
    throw new Error(error?.message || 'Failed to create practice');
  }
  return data.practice;
}

async function upsertCurrentUser(
  userId: string,
  userEmail: string,
  assignment: RoleEmailAssignment | undefined,
  practiceId: string,
  isPracticeManager: boolean
): Promise<string> {
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (existingUser) {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: assignment?.name || 'Practice Manager',
        role: (assignment?.roles[0] as any) || 'practice_manager',
        practice_id: practiceId,
        is_practice_manager: isPracticeManager,
      })
      .eq('id', userId)
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  const { data, error } = await (supabase as any)
    .from('users')
    .insert({
      auth_user_id: userId,
      name: assignment?.name || 'Practice Manager',
      practice_id: practiceId,
      is_practice_manager: isPracticeManager,
    })
    .select('id')
    .single();
  if (error) throw error;

  const { error: contactError } = await (supabase as any)
    .from('user_contact_details')
    .insert({ user_id: data.id, email: userEmail });
  if (contactError) {
    console.error('Error creating contact details:', contactError);
  }

  return data.id;
}

async function createTeamMember(
  assignment: RoleEmailAssignment,
  practiceId: string
): Promise<string | undefined> {
  const { data, error } = await supabase.functions.invoke('create-user-accounts', {
    body: {
      email: assignment.email,
      name: assignment.name,
      role: assignment.roles[0],
      practice_id: practiceId,
      password: assignment.password,
    },
  });
  if (error) throw error;
  return data?.user_id;
}

async function assignRoleToUser(userId: string, roleKey: string, practiceId: string): Promise<void> {
  const { data: catalogEntry } = await supabase
    .from('role_catalog')
    .select('id')
    .eq('role_key', roleKey)
    .single();
  if (!catalogEntry) return;

  let { data: practiceRole } = await supabase
    .from('practice_roles')
    .select('id')
    .eq('practice_id', practiceId)
    .eq('role_catalog_id', catalogEntry.id)
    .single();

  if (!practiceRole) {
    const { data } = await supabase
      .from('practice_roles')
      .insert({ practice_id: practiceId, role_catalog_id: catalogEntry.id, is_active: true })
      .select('id')
      .single();
    practiceRole = data;
  }

  if (practiceRole) {
    const { error } = await supabase
      .from('user_practice_roles')
      .upsert(
        { user_id: userId, practice_role_id: practiceRole.id, practice_id: practiceId },
        { onConflict: 'user_id,practice_role_id' }
      );
    if (error) console.error(`Error upserting user_practice_role for role ${roleKey}:`, error);
  }
}

async function createProcessTemplatesForPractice(
  taskSchedules: TaskScheduleConfig[],
  practiceId: string
) {
  const templateInserts = taskSchedules.map(schedule => ({
    practice_id: practiceId,
    name: schedule.templateName,
    responsible_role: schedule.responsibleRole as any,
    frequency: schedule.frequency as any,
    start_date: schedule.startDate,
    sla_hours: schedule.slaHours,
    custom_frequency: FREQUENCY_OPTIONS.find(f => f.value === schedule.frequency)?.label,
    active: true,
    steps: [],
  }));
  const { data, error } = await supabase
    .from('process_templates')
    .insert(templateInserts)
    .select();
  if (error) console.error('Error creating templates:', error);
  return { data, error };
}

async function createInitialProcessInstances(
  templates: any[],
  filledAssignments: RoleEmailAssignment[],
  createdUserIds: Record<string, string>,
  practiceId: string
): Promise<void> {
  const processInstances: object[] = [];
  for (const template of templates) {
    const usersWithRole = filledAssignments.filter(
      a => a.roles.includes(template.responsible_role) && createdUserIds[a.email]
    );
    for (const assignment of usersWithRole) {
      const userId = createdUserIds[assignment.email];
      if (!userId) continue;
      const startDate = new Date(template.start_date);
      processInstances.push({
        template_id: template.id,
        practice_id: practiceId,
        assignee_id: userId,
        status: 'pending',
        period_start: startDate.toISOString(),
        period_end: startDate.toISOString(),
        due_at: startDate.toISOString(),
      });
    }
  }
  if (processInstances.length > 0) {
    const { error } = await supabase.from('process_instances').insert(processInstances);
    if (error) console.error('Error creating process instances:', error);
  }
}

/**
 * Creates team member accounts for all assignments that are not the current user.
 * Returns a map of email -> userId for successfully created members.
 * Calls onWarning for each member whose creation fails.
 */
async function createTeamMembersWithFallback(
  assignments: RoleEmailAssignment[],
  currentUserEmail: string,
  practiceId: string,
  onWarning: (email: string) => void
): Promise<Record<string, string>> {
  const createdUserIds: Record<string, string> = {};
  for (const assignment of assignments.filter(a => a.email !== currentUserEmail)) {
    try {
      const userId = await createTeamMember(assignment, practiceId);
      if (userId) createdUserIds[assignment.email] = userId;
    } catch (err) {
      console.error(`Error creating user ${assignment.email}:`, err);
      onWarning(assignment.email);
    }
  }
  return createdUserIds;
}

/**
 * Assigns all roles for each filled assignment. Returns a list of failure
 * descriptions (roleKey + email). Does NOT show any toast — that responsibility
 * stays in the caller (handleSubmit).
 */
async function assignRolesWithFallback(
  filledAssignments: RoleEmailAssignment[],
  createdUserIds: Record<string, string>,
  practiceId: string
): Promise<string[]> {
  const roleAssignmentFailures: string[] = [];
  for (const assignment of filledAssignments) {
    const userId = createdUserIds[assignment.email];
    if (!userId) continue;
    for (const roleKey of assignment.roles) {
      try {
        await assignRoleToUser(userId, roleKey, practiceId);
      } catch (roleError) {
        console.error(`Error assigning role ${roleKey} to user:`, roleError);
        roleAssignmentFailures.push(`${roleKey} for ${assignment.email}`);
      }
    }
  }
  return roleAssignmentFailures;
}

async function provisionPracticeUsers(
  user: { id: string; email?: string | null },
  filledAssignments: RoleEmailAssignment[],
  practiceId: string
): Promise<Record<string, string>> {
  const currentUserAssignment = filledAssignments.find(a => a.email === user.email);
  const isPracticeManager = currentUserAssignment?.roles.includes('practice_manager') ?? false;
  const currentUserId = await upsertCurrentUser(
    user.id, user.email!, currentUserAssignment, practiceId, isPracticeManager
  );
  const seedUserIds: Record<string, string> = { [user.email!]: currentUserId };
  const newUserIds = await createTeamMembersWithFallback(
    filledAssignments,
    user.email!,
    practiceId,
    (email) => {
      toast({
        title: 'User creation warning',
        description: `Could not create account for ${email}`,
        variant: 'destructive',
      });
    }
  );
  const createdUserIds: Record<string, string> = { ...seedUserIds, ...newUserIds };
  const roleAssignmentFailures = await assignRolesWithFallback(filledAssignments, createdUserIds, practiceId);
  if (roleAssignmentFailures.length > 0) {
    toast({
      title: 'Role assignment warning',
      description: `Some roles could not be assigned: ${roleAssignmentFailures.join(', ')}`,
      variant: 'destructive',
    });
  }
  return createdUserIds;
}

async function finalizeSetup(
  filledAssignments: RoleEmailAssignment[],
  createdUserIds: Record<string, string>,
  taskSchedules: TaskScheduleConfig[],
  practiceId: string,
  onComplete: () => void
): Promise<void> {
  const { data: createdTemplates, error: templatesError } = await createProcessTemplatesForPractice(taskSchedules, practiceId);
  if (templatesError) {
    toast({ title: 'Template creation warning', description: 'Some task templates could not be created', variant: 'destructive' });
  }
  if (createdTemplates && createdTemplates.length > 0) {
    await createInitialProcessInstances(createdTemplates, filledAssignments, createdUserIds, practiceId);
  }
  const { error: setupError } = await supabase
    .from('organization_setup')
    .insert({ practice_id: practiceId, setup_completed: true });
  if (setupError) throw setupError;
  toast({
    title: 'Organization setup complete',
    description: `Your practice has been set up with ${filledAssignments.length} team members and ${taskSchedules.length} task templates`,
  });
  try {
    await supabase.functions.invoke('auto-provision-practice', { body: { practice_id: practiceId } });
  } catch (autoProvisionError) {
    console.error('Auto-provision error:', autoProvisionError);
    toast({
      title: 'Background provisioning skipped',
      description: 'Some optional features may need to be enabled manually in settings.',
    });
  }
  onComplete();
}

interface RunSetupParams {
  user: { id: string; email?: string | null } | null;
  organizationName: string;
  country: string;
  roleAssignments: RoleEmailAssignment[];
  taskSchedules: TaskScheduleConfig[];
  setLoading: (v: boolean) => void;
  onComplete: () => void;
}

async function runSetupSubmit({
  user,
  organizationName,
  country,
  roleAssignments,
  taskSchedules,
  setLoading,
  onComplete,
}: RunSetupParams): Promise<void> {
  const { error: validationError, filledAssignments } = validateSetupForm(organizationName, roleAssignments);
  if (validationError) {
    const validationMessages: Record<string, { title: string; description: string }> = {
      'Organization name required': { title: 'Organization name required', description: 'Please enter your organization name' },
      'No role assignments': { title: 'No role assignments', description: 'Please assign at least one person with roles' },
      'Practice Manager required': { title: 'Practice Manager required', description: 'Please assign at least one person as Practice Manager' },
    };
    toast({ ...validationMessages[validationError], variant: 'destructive' });
    return;
  }

  setLoading(true);
  try {
    if (!user) throw new Error('No user found');
    const practice = await createPracticeViaFunction(organizationName.trim(), country);
    const createdUserIds = await provisionPracticeUsers(user, filledAssignments, practice.id);
    await finalizeSetup(filledAssignments, createdUserIds, taskSchedules, practice.id, onComplete);
  } catch (error: any) {
    console.error('Setup error:', error);
    toast({
      title: 'Setup failed',
      description: error.message || 'Failed to set up organization',
      variant: 'destructive',
    });
  } finally {
    setLoading(false);
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface RoleSelectionGridProps {
  rolesLoading: boolean;
  rolesByCategory: Record<RoleCategory, RoleCatalogEntry[]>;
  assignmentIndex: number;
  selectedRoles: string[];
  onToggleRole: (roleValue: string) => void;
}

function RoleSelectionGrid({ rolesLoading, rolesByCategory, assignmentIndex, selectedRoles, onToggleRole }: RoleSelectionGridProps) {
  return (
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
                        id={`${assignmentIndex}-${role.role_key}`}
                        checked={selectedRoles.includes(role.role_key)}
                        onCheckedChange={() => onToggleRole(role.role_key)}
                      />
                      <label
                        htmlFor={`${assignmentIndex}-${role.role_key}`}
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
  );
}

interface SendLoginButtonProps {
  assignment: RoleEmailAssignment;
  organizationName: string;
  getRoleLabel: (key: string) => string;
}

function SendLoginButton({ assignment, organizationName, getRoleLabel }: SendLoginButtonProps) {
  if (!assignment.name || !assignment.email || !assignment.password || assignment.roles.length === 0) {
    return null;
  }
  return (
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
  );
}

interface TeamMemberCardProps {
  assignment: RoleEmailAssignment;
  index: number;
  rolesByCategory: Record<RoleCategory, RoleCatalogEntry[]>;
  rolesLoading: boolean;
  organizationName: string;
  assignmentCount: number;
  getRoleLabel: (key: string) => string;
  onUpdate: (field: keyof RoleEmailAssignment, value: any) => void;
  onRemove: () => void;
  onToggleRole: (roleValue: string) => void;
}

function TeamMemberCard({
  assignment,
  index,
  rolesByCategory,
  rolesLoading,
  organizationName,
  assignmentCount,
  getRoleLabel,
  onUpdate,
  onRemove,
  onToggleRole,
}: TeamMemberCardProps) {
  return (
    <Card key={index} className="p-4 border-2">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Team Member {index + 1}</Label>
          {assignmentCount > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
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
              onChange={(e) => onUpdate('name', e.target.value)}
              placeholder="Full name"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={assignment.email}
              onChange={(e) => onUpdate('email', e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={assignment.password}
              onChange={(e) => onUpdate('password', e.target.value)}
              placeholder="Create password"
            />
          </div>
        </div>

        <RoleSelectionGrid
          rolesLoading={rolesLoading}
          rolesByCategory={rolesByCategory}
          assignmentIndex={index}
          selectedRoles={assignment.roles}
          onToggleRole={onToggleRole}
        />

        <SendLoginButton
          assignment={assignment}
          organizationName={organizationName}
          getRoleLabel={getRoleLabel}
        />
      </div>
    </Card>
  );
}

interface TaskScheduleCardProps {
  schedule: TaskScheduleConfig;
  index: number;
  getRoleLabel: (key: string) => string;
  onUpdate: (field: keyof TaskScheduleConfig, value: any) => void;
}

function TaskScheduleCard({ schedule, index, getRoleLabel, onUpdate }: TaskScheduleCardProps) {
  return (
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
              onValueChange={(value) => onUpdate('frequency', value)}
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
                onChange={(e) => onUpdate('startDate', e.target.value)}
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
              onChange={(e) => onUpdate('slaHours', parseInt(e.target.value) || 24)}
              placeholder="24"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Role catalog sub-hook
// ---------------------------------------------------------------------------

function useSetupRoleCatalog() {
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogEntry[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('role_catalog')
          .select('id, role_key, display_name, category, description')
          .order('display_name');

        if (error) throw error;
        // Cast category to RoleCategory
        setRoleCatalog((data || []).map(r => ({
          ...r,
          category: r.category as RoleCategory,
          default_capabilities: [],
          created_at: '',
          updated_at: '',
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

  const getRoleLabel = (roleKey: string): string =>
    roleCatalog.find(r => r.role_key === roleKey)?.display_name || roleKey;

  return { rolesLoading, rolesByCategory, getRoleLabel };
}

// ---------------------------------------------------------------------------
// Role assignments sub-hook
// ---------------------------------------------------------------------------

function useRoleAssignments() {
  const [roleAssignments, setRoleAssignments] = useState<RoleEmailAssignment[]>([
    { email: '', name: '', password: '', roles: ['practice_manager'] }
  ]);

  const addRoleAssignment = () => {
    setRoleAssignments(prev => [...prev, { email: '', name: '', password: '', roles: [] }]);
  };

  const removeRoleAssignment = (index: number) => {
    setRoleAssignments(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const updateRoleAssignment = (index: number, field: keyof RoleEmailAssignment, value: any) => {
    setRoleAssignments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const toggleRole = (assignmentIndex: number, roleValue: string) => {
    setRoleAssignments(prev => {
      const updated = [...prev];
      const assignment = { ...updated[assignmentIndex] };
      if (assignment.roles.includes(roleValue)) {
        if (roleValue === 'practice_manager') {
          const hasPM = prev.some((a, i) =>
            i !== assignmentIndex && a.roles.includes('practice_manager') && a.name && a.email
          );
          if (!hasPM) {
            toast({
              title: "Cannot remove Practice Manager",
              description: "At least one person must be assigned as Practice Manager",
              variant: "destructive",
            });
            return prev;
          }
        }
        assignment.roles = assignment.roles.filter(r => r !== roleValue);
      } else {
        assignment.roles = [...assignment.roles, roleValue];
      }
      updated[assignmentIndex] = assignment;
      return updated;
    });
  };

  return { roleAssignments, addRoleAssignment, removeRoleAssignment, updateRoleAssignment, toggleRole };
}

// ---------------------------------------------------------------------------
// State hook
// ---------------------------------------------------------------------------

function useOrganizationSetupState() {
  const { user, signOut } = useAuth();
  const [organizationName, setOrganizationName] = useState('');
  const [country, setCountry] = useState<'Wales' | 'England' | 'Scotland'>('England');
  const { roleAssignments, addRoleAssignment, removeRoleAssignment, updateRoleAssignment, toggleRole } = useRoleAssignments();
  const { rolesLoading, rolesByCategory, getRoleLabel } = useSetupRoleCatalog();

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

  const updateTaskSchedule = (index: number, field: keyof TaskScheduleConfig, value: any) => {
    setTaskSchedules(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleExit = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/';
    }
  };

  return {
    user,
    organizationName, setOrganizationName,
    country, setCountry,
    roleAssignments,
    rolesLoading,
    taskSchedules,
    loading, setLoading,
    rolesByCategory,
    getRoleLabel,
    addRoleAssignment,
    removeRoleAssignment,
    updateRoleAssignment,
    toggleRole,
    updateTaskSchedule,
    handleExit,
  };
}

// ---------------------------------------------------------------------------
// JSX section sub-components
// ---------------------------------------------------------------------------

interface OrganizationDetailsCardProps {
  organizationName: string;
  country: string;
  onNameChange: (v: string) => void;
  onCountryChange: (v: string) => void;
}

function OrganizationDetailsCard({ organizationName, country, onNameChange, onCountryChange }: OrganizationDetailsCardProps) {
  return (
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
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Enter your practice name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select value={country} onValueChange={onCountryChange}>
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
  );
}

interface RoleAssignmentsCardProps {
  roleAssignments: RoleEmailAssignment[];
  rolesByCategory: Record<RoleCategory, RoleCatalogEntry[]>;
  rolesLoading: boolean;
  organizationName: string;
  getRoleLabel: (key: string) => string;
  onAdd: () => void;
  onUpdate: (index: number, field: keyof RoleEmailAssignment, value: any) => void;
  onRemove: (index: number) => void;
  onToggleRole: (index: number, roleValue: string) => void;
}

function RoleAssignmentsCard({ roleAssignments, rolesByCategory, rolesLoading, organizationName, getRoleLabel, onAdd, onUpdate, onRemove, onToggleRole }: RoleAssignmentsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Member Role Assignments</CardTitle>
            <CardDescription>
              Assign email addresses and roles. Each person can have multiple roles.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Person
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {roleAssignments.map((assignment, index) => (
          <TeamMemberCard
            key={index}
            assignment={assignment}
            index={index}
            rolesByCategory={rolesByCategory}
            rolesLoading={rolesLoading}
            organizationName={organizationName}
            assignmentCount={roleAssignments.length}
            getRoleLabel={getRoleLabel}
            onUpdate={(field, value) => onUpdate(index, field, value)}
            onRemove={() => onRemove(index)}
            onToggleRole={(roleValue) => onToggleRole(index, roleValue)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface TaskSchedulingCardProps {
  taskSchedules: TaskScheduleConfig[];
  getRoleLabel: (key: string) => string;
  onUpdate: (index: number, field: keyof TaskScheduleConfig, value: any) => void;
}

function TaskSchedulingCard({ taskSchedules, getRoleLabel, onUpdate }: TaskSchedulingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Scheduling Configuration</CardTitle>
        <CardDescription>
          Configure frequency, start date, and SLA for each task template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {taskSchedules.map((schedule, index) => (
          <TaskScheduleCard
            key={index}
            schedule={schedule}
            index={index}
            getRoleLabel={getRoleLabel}
            onUpdate={(field, value) => onUpdate(index, field, value)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OrganizationSetup({ onComplete }: OrganizationSetupProps) {
  const {
    user,
    organizationName, setOrganizationName,
    country, setCountry,
    roleAssignments,
    rolesLoading,
    taskSchedules,
    loading, setLoading,
    rolesByCategory,
    getRoleLabel,
    addRoleAssignment,
    removeRoleAssignment,
    updateRoleAssignment,
    toggleRole,
    updateTaskSchedule,
    handleExit,
  } = useOrganizationSetupState();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSetupSubmit({ user, organizationName, country, roleAssignments, taskSchedules, setLoading, onComplete });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <OrganizationDetailsCard
            organizationName={organizationName}
            country={country}
            onNameChange={setOrganizationName}
            onCountryChange={(value: any) => setCountry(value)}
          />
          <RoleAssignmentsCard
            roleAssignments={roleAssignments}
            rolesByCategory={rolesByCategory}
            rolesLoading={rolesLoading}
            organizationName={organizationName}
            getRoleLabel={getRoleLabel}
            onAdd={addRoleAssignment}
            onUpdate={updateRoleAssignment}
            onRemove={removeRoleAssignment}
            onToggleRole={toggleRole}
          />
          <TaskSchedulingCard
            taskSchedules={taskSchedules}
            getRoleLabel={getRoleLabel}
            onUpdate={updateTaskSchedule}
          />
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
