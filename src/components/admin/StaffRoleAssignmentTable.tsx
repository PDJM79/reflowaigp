import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Search, UserCheck, UserX } from 'lucide-react';
import { RoleAssignmentPopover } from './RoleAssignmentPopover';
import { toast } from 'sonner';
import { type Capability } from '@/types/roles';

interface RoleCatalogEntry {
  id: string;
  role_key: string;
  display_name: string;
  category: string;
  default_capabilities: string[];
}

// A practice role as served by the API (snake_case, with nested catalog).
interface PracticeRole {
  id: string;
  role_catalog_id: string;
  is_active?: boolean;
  role_catalog?: RoleCatalogEntry | null;
}

// One of a user's role assignments as served by /staff-roles.
interface UserRole {
  practice_role_id: string;
  practice_role: PracticeRole | null;
}

interface User {
  id: string;
  name: string;
  isActive: boolean;
  user_practice_roles: UserRole[];
}

interface PendingChange {
  userId: string;
  userName: string;
  toAdd: { id: string; name: string }[];
  toRemove: { id: string; name: string }[];
}

interface StaffRoleAssignmentTableProps {
  onCapabilitiesChange?: (users: { id: string; name: string; capabilities: Capability[] }[]) => void;
}

export function StaffRoleAssignmentTable({ onCapabilitiesChange }: StaffRoleAssignmentTableProps) {
  const { user } = useAuth();
  const selectedPracticeId = user?.practiceId ?? null;
  const [users, setUsers] = useState<User[]>([]);
  const [practiceRoles, setPracticeRoles] = useState<PracticeRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [applying, setApplying] = useState(false);

  const fetchData = async () => {
    if (!selectedPracticeId) return;

    setLoading(true);
    setError(null);
    try {
      const [staffRes, rolesRes] = await Promise.all([
        fetch(`/api/practices/${selectedPracticeId}/staff-roles`, { credentials: 'include' }),
        fetch(`/api/practices/${selectedPracticeId}/practice-roles`, { credentials: 'include' }),
      ]);
      if (!staffRes.ok || !rolesRes.ok) {
        throw new Error(`Failed to load (${staffRes.status}/${rolesRes.status})`);
      }

      const staff = await staffRes.json() as User[];
      const roles = (await rolesRes.json() as PracticeRole[]).filter(r => r.is_active !== false);

      setUsers(staff);
      setPracticeRoles(roles);

      // Capability coverage tracking (defaults of each held role)
      if (onCapabilitiesChange) {
        const usersWithCapabilities = staff.map((u) => {
          const capabilities = u.user_practice_roles
            .filter((ur) => ur.practice_role?.role_catalog)
            .flatMap((ur) => (ur.practice_role!.role_catalog!.default_capabilities || []) as Capability[]);
          return {
            id: u.id,
            name: u.name,
            capabilities: [...new Set(capabilities)] as Capability[],
          };
        });
        onCapabilitiesChange(usersWithCapabilities);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load staff data');
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPracticeId]);

  const roleName = (roleId: string): string =>
    practiceRoles.find(r => r.id === roleId)?.role_catalog?.display_name || 'Unknown role';

  // Called by the popover; stages the diff and opens a confirmation dialog.
  const handleRoleSave = async (userId: string, newRoleIds: string[]) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    const currentRoleIds = target.user_practice_roles
      .filter(ur => ur.practice_role)
      .map(ur => ur.practice_role_id);

    const toAdd = newRoleIds.filter(id => !currentRoleIds.includes(id));
    const toRemove = currentRoleIds.filter(id => !newRoleIds.includes(id));

    if (toAdd.length === 0 && toRemove.length === 0) return;

    setPendingChange({
      userId,
      userName: target.name,
      toAdd: toAdd.map(id => ({ id, name: roleName(id) })),
      toRemove: toRemove.map(id => ({ id, name: roleName(id) })),
    });
  };

  // Applies the staged change through the manager-gated API (server also audits it).
  const applyPendingChange = async () => {
    if (!pendingChange || !selectedPracticeId) return;
    const { userId, toAdd, toRemove } = pendingChange;
    setApplying(true);
    try {
      for (const role of toRemove) {
        const res = await fetch(`/api/practices/${selectedPracticeId}/user-practice-roles`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, practiceRoleId: role.id }),
        });
        if (!res.ok) throw new Error(`Failed to remove ${role.name}`);
      }
      for (const role of toAdd) {
        const res = await fetch(`/api/practices/${selectedPracticeId}/user-practice-roles`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, practiceRoleId: role.id }),
        });
        if (!res.ok) throw new Error(`Failed to add ${role.name}`);
      }
      toast.success('Roles updated successfully');
      setPendingChange(null);
      await fetchData();
    } catch (err) {
      console.error('Error updating roles:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update roles');
    } finally {
      setApplying(false);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    if (!selectedPracticeId) return;
    try {
      const res = await fetch(`/api/practices/${selectedPracticeId}/users/${userId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch (err) {
      console.error('Error toggling status:', err);
      toast.error('Failed to update user status');
    }
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'clinical': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'governance': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'it': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'support': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pcn': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter === 'active' && !u.isActive) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;
      if (roleFilter !== 'all') {
        const hasRole = u.user_practice_roles.some(ur => ur.practice_role_id === roleFilter);
        if (!hasRole) return false;
      }
      return true;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={() => fetchData()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {practiceRoles.map(role => (
              <SelectItem key={role.id} value={role.id}>
                {role.role_catalog?.display_name || 'Unknown'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No staff members found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={u.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-muted text-muted-foreground'
                      }
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.user_practice_roles.length === 0 ? (
                        <span className="text-sm text-muted-foreground">No roles assigned</span>
                      ) : (
                        u.user_practice_roles
                          .filter(ur => ur.practice_role?.role_catalog)
                          .map(ur => (
                            <Badge
                              key={ur.practice_role_id}
                              variant="outline"
                              className={getCategoryColor(ur.practice_role!.role_catalog!.category)}
                            >
                              {ur.practice_role!.role_catalog!.display_name}
                            </Badge>
                          ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <RoleAssignmentPopover
                        userName={u.name}
                        currentRoleIds={u.user_practice_roles.map(ur => ur.practice_role_id)}
                        availableRoles={practiceRoles}
                        onSave={(roleIds) => handleRoleSave(u.id, roleIds)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusToggle(u.id, u.isActive)}
                      >
                        {u.isActive ? (
                          <UserX className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation dialog for role changes */}
      <AlertDialog open={pendingChange !== null} onOpenChange={(open) => { if (!open) setPendingChange(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm role changes for {pendingChange?.userName}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {pendingChange && pendingChange.toAdd.length > 0 && (
                  <div>
                    <span className="font-medium text-green-700 dark:text-green-400">Add:</span>{' '}
                    {pendingChange.toAdd.map(r => r.name).join(', ')}
                  </div>
                )}
                {pendingChange && pendingChange.toRemove.length > 0 && (
                  <div>
                    <span className="font-medium text-red-700 dark:text-red-400">Remove:</span>{' '}
                    {pendingChange.toRemove.map(r => r.name).join(', ')}
                  </div>
                )}
                <p className="text-muted-foreground">
                  This changes what this staff member can access and is recorded in the audit log.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); applyPendingChange(); }}
              disabled={applying}
            >
              {applying ? 'Applying…' : 'Confirm changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
