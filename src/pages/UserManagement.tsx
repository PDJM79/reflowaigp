import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { Search, UserPlus, Shield, CheckCircle, XCircle, Settings, Plus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { toast } from 'sonner';
import { UserManagementDialog } from '@/components/admin/UserManagementDialog';

interface UserRole {
  practice_role_id: string;
  practice_roles: {
    id: string;
    role_catalog: {
      display_name: string;
      category: string;
    } | null;
  } | null;
}

interface User {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  user_practice_roles: UserRole[];
}

const CATEGORY_COLORS: Record<string, string> = {
  clinical: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  governance: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  it: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  support: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  pcn: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
};

export default function UserManagement() {
  const { user } = useAuth();
  const { hasCapability } = useCapabilities();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredUsers(
        users.filter(u => 
          u.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    if (!user?.practiceId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          is_active,
          created_at,
          user_practice_roles(
            practice_role_id,
            practice_roles:practice_role_id(
              id,
              role_catalog:role_catalog_id(
                display_name,
                category
              )
            )
          )
        `)
        .eq('practice_id', user.practiceId)
        .order('name');

      if (error) throw error;
      setUsers((data || []) as User[]);
      setFilteredUsers((data || []) as User[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(currentStatus ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsDialogOpen(true);
  };

  const getRoleColor = (category: string | undefined) => {
    return CATEGORY_COLORS[category || 'support'] || CATEGORY_COLORS.support;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-3xl font-bold">User Management</h1>
          </div>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions for your practice
          </p>
        </div>
        <div className="flex gap-2">
          {hasCapability('assign_roles') && (
            <>
              <Link to="/staff-roles">
                <Button variant="outline">
                  <Users className="h-5 w-5 mr-2" />
                  Staff Roles
                </Button>
              </Link>
              <Link to="/role-management">
                <Button variant="outline">
                  <Settings className="h-5 w-5 mr-2" />
                  Manage Roles
                </Button>
              </Link>
            </>
          )}
          <Button onClick={handleCreateUser} size="lg">
            <UserPlus className="h-5 w-5 mr-2" />
            Add New User
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => (
          <Card key={u.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{u.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {u.is_active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Roles */}
              <div>
                <p className="text-sm font-medium mb-2">Roles:</p>
                <div className="flex flex-wrap gap-2">
                  {u.user_practice_roles.length > 0 ? (
                    u.user_practice_roles.map((upr, idx) => {
                      const roleName = upr.practice_roles?.role_catalog?.display_name || 'Unknown';
                      const category = upr.practice_roles?.role_catalog?.category;
                      return (
                        <Badge key={idx} className={getRoleColor(category)}>
                          {roleName}
                        </Badge>
                      );
                    })
                  ) : (
                    <span className="text-sm text-muted-foreground">No roles assigned</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEditUser(u)}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Edit Roles
                </Button>
                <Button
                  variant={u.is_active ? "outline" : "default"}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                >
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search criteria' : 'Get started by adding your first user'}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateUser}>
                <Plus className="h-4 w-4 mr-2" />
                Add New User
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <UserManagementDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={fetchUsers}
        user={selectedUser}
      />
    </div>
  );
}
