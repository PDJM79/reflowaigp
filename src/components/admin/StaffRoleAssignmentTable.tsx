import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

interface PracticeRole {
  id: string;
  role_catalog_id: string;
  role_catalog?: RoleCatalogEntry;
}

interface UserRole {
  practice_role_id: string;
  practice_roles: PracticeRole | null;
}

interface User {
  id: string;
  name: string;
  is_active: boolean;
  user_practice_roles: UserRole[];
}

interface StaffRoleAssignmentTableProps {
  onCapabilitiesChange?: (users: { id: string; name: string; capabilities: Capability[] }[]) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  clinical: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  governance: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  it: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  support: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  pcn: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? 'bg-muted text-muted-foreground';
}

async function fetchStaffData(
  practiceId: string,
  setUsers: (u: User[]) => void,
  setPracticeRoles: (r: PracticeRole[]) => void,
  onCapabilitiesChange?: (users: { id: string; name: string; capabilities: Capability[] }[]) => void
): Promise<void> {
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select(`
      id, name, is_active,
      user_practice_roles(
        practice_role_id,
        practice_roles:practice_role_id(
          id, role_catalog_id,
          role_catalog:role_catalog_id(id, role_key, display_name, category, default_capabilities)
        )
      )
    `)
    .eq('practice_id', practiceId)
    .order('name');
  if (usersError) throw usersError;

  const { data: rolesData, error: rolesError } = await supabase
    .from('practice_roles')
    .select(`id, role_catalog_id, role_catalog:role_catalog_id(id, role_key, display_name, category, default_capabilities)`)
    .eq('practice_id', practiceId)
    .eq('is_active', true);
  if (rolesError) throw rolesError;

  setUsers((usersData || []) as unknown as User[]);
  setPracticeRoles((rolesData || []) as unknown as PracticeRole[]);

  if (onCapabilitiesChange) {
    const withCaps = (usersData || []).map((user: any) => {
      const capabilities = user.user_practice_roles
        .filter((ur: any) => ur.practice_roles?.role_catalog)
        .flatMap((ur: any) => ur.practice_roles!.role_catalog!.default_capabilities as Capability[]);
      return { id: user.id as string, name: user.name as string, capabilities: [...new Set(capabilities)] as Capability[] };
    });
    onCapabilitiesChange(withCaps);
  }
}

async function applyRoleChanges(
  userId: string,
  currentRoleIds: string[],
  newRoleIds: string[],
  practiceId: string
): Promise<void> {
  const toRemove = currentRoleIds.filter(id => !newRoleIds.includes(id));
  const toAdd = newRoleIds.filter(id => !currentRoleIds.includes(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('user_practice_roles')
      .delete()
      .eq('user_id', userId)
      .in('practice_role_id', toRemove);
    if (error) throw error;
  }
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('user_practice_roles')
      .insert(toAdd.map(roleId => ({ user_id: userId, practice_role_id: roleId, practice_id: practiceId })));
    if (error) throw error;
  }
}

async function toggleUserActiveStatus(userId: string, currentStatus: boolean): Promise<void> {
  const { error } = await supabase.from('users').update({ is_active: !currentStatus }).eq('id', userId);
  if (error) throw error;
}

function useStaffData(
  selectedPracticeId: string | null,
  onCapabilitiesChange?: (users: { id: string; name: string; capabilities: Capability[] }[]) => void
) {
  const [users, setUsers] = useState<User[]>([]);
  const [practiceRoles, setPracticeRoles] = useState<PracticeRole[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!selectedPracticeId) return;
    setLoading(true);
    try {
      await fetchStaffData(selectedPracticeId, setUsers, setPracticeRoles, onCapabilitiesChange);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [selectedPracticeId]);

  const handleRoleSave = async (userId: string, newRoleIds: string[]) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const currentRoleIds = user.user_practice_roles.filter(ur => ur.practice_roles).map(ur => ur.practice_role_id);
    try {
      await applyRoleChanges(userId, currentRoleIds, newRoleIds, selectedPracticeId!);
      toast.success('Roles updated successfully');
      reload();
    } catch (error) {
      console.error('Error updating roles:', error);
      toast.error('Failed to update roles');
      throw error;
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleUserActiveStatus(userId, currentStatus);
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'}`);
      reload();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update user status');
    }
  };

  return { users, practiceRoles, loading, handleRoleSave, handleStatusToggle };
}

interface StaffFiltersProps {
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;
  practiceRoles: PracticeRole[];
  onSearchChange: (v: string) => void;
  onRoleChange: (v: string) => void;
  onStatusChange: (v: string) => void;
}

function StaffFilters({ searchQuery, roleFilter, statusFilter, practiceRoles, onSearchChange, onRoleChange, onStatusChange }: StaffFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search staff..." value={searchQuery} onChange={e => onSearchChange(e.target.value)} className="pl-9" />
      </div>
      <Select value={roleFilter} onValueChange={onRoleChange}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by role" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All roles</SelectItem>
          {practiceRoles.map(role => (
            <SelectItem key={role.id} value={role.id}>{role.role_catalog?.display_name || 'Unknown'}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

interface StaffTableRowProps {
  user: User;
  practiceRoles: PracticeRole[];
  onRoleSave: (userId: string, roleIds: string[]) => Promise<void>;
  onStatusToggle: (userId: string, currentStatus: boolean) => void;
}

function StaffTableRow({ user, practiceRoles, onRoleSave, onStatusToggle }: StaffTableRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{user.name}</TableCell>
      <TableCell>
        <Badge variant="outline" className={user.is_active
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-muted text-muted-foreground'}>
          {user.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {user.user_practice_roles.length === 0
            ? <span className="text-sm text-muted-foreground">No roles assigned</span>
            : user.user_practice_roles
                .filter(ur => ur.practice_roles?.role_catalog)
                .map(ur => (
                  <Badge key={ur.practice_role_id} variant="outline" className={getCategoryColor(ur.practice_roles!.role_catalog!.category)}>
                    {ur.practice_roles!.role_catalog!.display_name}
                  </Badge>
                ))}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <RoleAssignmentPopover
            userName={user.name}
            currentRoleIds={user.user_practice_roles.map(ur => ur.practice_role_id)}
            availableRoles={practiceRoles}
            onSave={(roleIds) => onRoleSave(user.id, roleIds)}
          />
          <Button variant="ghost" size="sm" onClick={() => onStatusToggle(user.id, user.is_active)}>
            {user.is_active
              ? <UserX className="h-4 w-4 text-muted-foreground" />
              : <UserCheck className="h-4 w-4 text-green-600" />}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function StaffRoleAssignmentTable({ onCapabilitiesChange }: StaffRoleAssignmentTableProps) {
  const { user } = useAuth();
  const selectedPracticeId = user?.practiceId ?? null;
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const { users, practiceRoles, loading, handleRoleSave, handleStatusToggle } = useStaffData(
    selectedPracticeId, onCapabilitiesChange
  );

  const filteredUsers = useMemo(() => users.filter(u => {
    if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter === 'active' && !u.is_active) return false;
    if (statusFilter === 'inactive' && u.is_active) return false;
    if (roleFilter !== 'all' && !u.user_practice_roles.some(ur => ur.practice_role_id === roleFilter)) return false;
    return true;
  }), [users, searchQuery, statusFilter, roleFilter]);

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <StaffFilters
        searchQuery={searchQuery}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        practiceRoles={practiceRoles}
        onSearchChange={setSearchQuery}
        onRoleChange={setRoleFilter}
        onStatusChange={setStatusFilter}
      />
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
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No staff members found</TableCell>
              </TableRow>
            ) : (
              filteredUsers.map(u => (
                <StaffTableRow
                  key={u.id}
                  user={u}
                  practiceRoles={practiceRoles}
                  onRoleSave={handleRoleSave}
                  onStatusToggle={handleStatusToggle}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
