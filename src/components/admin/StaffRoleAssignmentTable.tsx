import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePracticeSelection } from '@/hooks/usePracticeSelection';
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

export function StaffRoleAssignmentTable({ onCapabilitiesChange }: StaffRoleAssignmentTableProps) {
  const { selectedPracticeId } = usePracticeSelection();
  const [users, setUsers] = useState<User[]>([]);
  const [practiceRoles, setPracticeRoles] = useState<PracticeRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const fetchData = async () => {
    if (!selectedPracticeId) return;
    
    setLoading(true);
    try {
      // Fetch users with their roles
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id, name, is_active,
          user_practice_roles(
            practice_role_id,
            practice_roles:practice_role_id(
              id,
              role_catalog_id,
              role_catalog:role_catalog_id(
                id, role_key, display_name, category, default_capabilities
              )
            )
          )
        `)
        .eq('practice_id', selectedPracticeId)
        .order('name');

      if (usersError) throw usersError;

      // Fetch available practice roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('practice_roles')
        .select(`
          id,
          role_catalog_id,
          role_catalog:role_catalog_id(
            id, role_key, display_name, category, default_capabilities
          )
        `)
        .eq('practice_id', selectedPracticeId)
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      // Cast to our interface types
      setUsers((usersData || []) as unknown as User[]);
      setPracticeRoles((rolesData || []) as unknown as PracticeRole[]);

      // Calculate capabilities for coverage tracking
      if (onCapabilitiesChange) {
        const usersWithCapabilities = (usersData || []).map((user: any) => {
          const capabilities = user.user_practice_roles
            .filter((ur: any) => ur.practice_roles?.role_catalog)
            .flatMap((ur: any) => ur.practice_roles!.role_catalog!.default_capabilities as Capability[]);
          return {
            id: user.id as string,
            name: user.name as string,
            capabilities: [...new Set(capabilities)] as Capability[],
          };
        });
        onCapabilitiesChange(usersWithCapabilities);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPracticeId]);

  const handleRoleSave = async (userId: string, newRoleIds: string[]) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const currentRoleIds = user.user_practice_roles
      .filter(ur => ur.practice_roles)
      .map(ur => ur.practice_role_id);

    const toAdd = newRoleIds.filter(id => !currentRoleIds.includes(id));
    const toRemove = currentRoleIds.filter(id => !newRoleIds.includes(id));

    try {
      // Remove roles
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('user_practice_roles')
          .delete()
          .eq('user_id', userId)
          .in('practice_role_id', toRemove);
        if (removeError) throw removeError;
      }

      // Add roles
      if (toAdd.length > 0 && selectedPracticeId) {
        const { error: addError } = await supabase
          .from('user_practice_roles')
          .insert(toAdd.map(roleId => ({
            user_id: userId,
            practice_role_id: roleId,
            practice_id: selectedPracticeId,
          })));
        if (addError) throw addError;
      }

      toast.success('Roles updated successfully');
      fetchData();
    } catch (error) {
      console.error('Error updating roles:', error);
      toast.error('Failed to update roles');
      throw error;
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch (error) {
      console.error('Error toggling status:', error);
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
    return users.filter(user => {
      // Search filter
      if (searchQuery && !user.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Status filter
      if (statusFilter === 'active' && !user.is_active) return false;
      if (statusFilter === 'inactive' && user.is_active) return false;
      // Role filter
      if (roleFilter !== 'all') {
        const hasRole = user.user_practice_roles.some(
          ur => ur.practice_role_id === roleFilter
        );
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
              filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={user.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-muted text-muted-foreground'
                      }
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.user_practice_roles.length === 0 ? (
                        <span className="text-sm text-muted-foreground">No roles assigned</span>
                      ) : (
                        user.user_practice_roles
                          .filter(ur => ur.practice_roles?.role_catalog)
                          .map(ur => (
                            <Badge 
                              key={ur.practice_role_id} 
                              variant="outline"
                              className={getCategoryColor(ur.practice_roles!.role_catalog!.category)}
                            >
                              {ur.practice_roles!.role_catalog!.display_name}
                            </Badge>
                          ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <RoleAssignmentPopover
                        userName={user.name}
                        currentRoleIds={user.user_practice_roles.map(ur => ur.practice_role_id)}
                        availableRoles={practiceRoles}
                        onSave={(roleIds) => handleRoleSave(user.id, roleIds)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusToggle(user.id, user.is_active)}
                      >
                        {user.is_active ? (
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
    </div>
  );
}
