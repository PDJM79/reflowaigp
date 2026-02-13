import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Mail, UserPlus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RoleCatalogEntry,
  Capability,
  CRITICAL_CAPABILITIES,
  CAPABILITY_LABELS,
} from '@/types/roles';

export interface UserRoleAssignment {
  id: string;
  name: string;
  email: string;
  password: string;
  roleIds: string[];
}

interface UserRoleAssignerProps {
  /** Available roles to assign */
  availableRoles: RoleCatalogEntry[];
  /** Current user assignments */
  assignments: UserRoleAssignment[];
  /** Callback when assignments change */
  onAssignmentsChange: (assignments: UserRoleAssignment[]) => void;
  /** Organization name for email template */
  organizationName?: string;
  /** Get effective capabilities for a role */
  getEffectiveCapabilities?: (roleId: string) => Capability[];
  /** Whether in read-only mode */
  disabled?: boolean;
}

export function UserRoleAssigner({
  availableRoles,
  assignments,
  onAssignmentsChange,
  organizationName = 'Practice',
  getEffectiveCapabilities,
  disabled = false,
}: UserRoleAssignerProps) {
  const generateId = () => `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addAssignment = () => {
    if (disabled) return;
    onAssignmentsChange([
      ...assignments,
      { id: generateId(), name: '', email: '', password: '', roleIds: [] },
    ]);
  };

  const removeAssignment = (id: string) => {
    if (disabled || assignments.length <= 1) return;
    onAssignmentsChange(assignments.filter(a => a.id !== id));
  };

  const updateAssignment = (id: string, field: keyof UserRoleAssignment, value: any) => {
    if (disabled) return;
    onAssignmentsChange(
      assignments.map(a => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const toggleRole = (assignmentId: string, roleId: string) => {
    if (disabled) return;
    
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    const newRoleIds = assignment.roleIds.includes(roleId)
      ? assignment.roleIds.filter(id => id !== roleId)
      : [...assignment.roleIds, roleId];

    updateAssignment(assignmentId, 'roleIds', newRoleIds);
  };

  // Get all assigned capabilities across all users
  const getAllAssignedCapabilities = (): Set<Capability> => {
    const allCaps = new Set<Capability>();
    
    if (getEffectiveCapabilities) {
      assignments.forEach(assignment => {
        assignment.roleIds.forEach(roleId => {
          getEffectiveCapabilities(roleId).forEach(cap => allCaps.add(cap));
        });
      });
    } else {
      assignments.forEach(assignment => {
        assignment.roleIds.forEach(roleId => {
          const role = availableRoles.find(r => r.id === roleId);
          if (role) {
            role.default_capabilities.forEach(cap => allCaps.add(cap));
          }
        });
      });
    }
    
    return allCaps;
  };

  const getMissingCriticalCapabilities = (): Capability[] => {
    const assignedCaps = getAllAssignedCapabilities();
    return CRITICAL_CAPABILITIES.filter(cap => !assignedCaps.has(cap));
  };

  const getRoleDisplayInfo = (roleId: string) => {
    const role = availableRoles.find(r => r.id === roleId);
    return role ? { name: role.display_name, category: role.category } : null;
  };

  const sendLoginEmail = (assignment: UserRoleAssignment) => {
    const roleNames = assignment.roleIds
      .map(id => getRoleDisplayInfo(id)?.name)
      .filter(Boolean)
      .join(', ');

    const subject = encodeURIComponent(`Your ${organizationName} Account`);
    const body = encodeURIComponent(`Hello ${assignment.name},

Your account has been set up for ${organizationName}.

Email: ${assignment.email}
Password: ${assignment.password}
Roles: ${roleNames}

Login at: ${window.location.origin}

Best regards`);
    
    window.open(`mailto:${assignment.email}?subject=${subject}&body=${body}`);
  };

  const missingCritical = getMissingCriticalCapabilities();
  const validAssignments = assignments.filter(
    a => a.name.trim() && a.email.trim() && a.roleIds.length > 0
  );

  // Check if at least one user has Practice Manager role
  const pmRole = availableRoles.find(r => r.role_key === 'practice_manager');
  const hasPracticeManager = pmRole
    ? assignments.some(a => a.roleIds.includes(pmRole.id) && a.name && a.email)
    : false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <CardTitle>Assign Team Members</CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAssignment}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Person
          </Button>
        </div>
        <CardDescription>
          Add team members and assign them to roles. Each person can have multiple roles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasPracticeManager && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              At least one person must be assigned as Practice Manager.
            </AlertDescription>
          </Alert>
        )}

        {missingCritical.length > 0 && validAssignments.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> No one is assigned to handle:{' '}
              {missingCritical.map(cap => CAPABILITY_LABELS[cap]).join(', ')}.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{validAssignments.length}</Badge>
          <span>team members configured</span>
        </div>

        <div className="space-y-4">
          {assignments.map((assignment, index) => (
            <Card key={assignment.id} className="p-4 border-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Team Member {index + 1}
                  </Label>
                  {assignments.length > 1 && !disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAssignment(assignment.id)}
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
                      onChange={(e) => updateAssignment(assignment.id, 'name', e.target.value)}
                      placeholder="Full name"
                      disabled={disabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={assignment.email}
                      onChange={(e) => updateAssignment(assignment.id, 'email', e.target.value)}
                      placeholder="user@example.com"
                      disabled={disabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={assignment.password}
                      onChange={(e) => updateAssignment(assignment.id, 'password', e.target.value)}
                      placeholder="Create password"
                      disabled={disabled}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Assigned Roles ({assignment.roleIds.length} selected)
                  </Label>
                  <ScrollArea className="h-48 border rounded-lg p-3">
                    <div className="space-y-2">
                      {availableRoles.map(role => (
                        <div
                          key={role.id}
                          className={`flex items-center gap-3 p-2 rounded transition-colors ${
                            assignment.roleIds.includes(role.id)
                              ? 'bg-primary/10'
                              : 'hover:bg-muted/50'
                          } ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
                          onClick={() => toggleRole(assignment.id, role.id)}
                        >
                          <Checkbox
                            checked={assignment.roleIds.includes(role.id)}
                            onCheckedChange={() => toggleRole(assignment.id, role.id)}
                            disabled={disabled}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium">{role.display_name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {role.category}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {assignment.roleIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {assignment.roleIds.map(roleId => {
                      const info = getRoleDisplayInfo(roleId);
                      return info ? (
                        <Badge key={roleId} variant="secondary">
                          {info.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}

                {assignment.name && assignment.email && assignment.password && assignment.roleIds.length > 0 && !disabled && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => sendLoginEmail(assignment)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Login Details
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
