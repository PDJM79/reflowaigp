import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { Plus, Search, UserPlus, Mail, Shield, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { UserManagementDialog } from '@/components/admin/UserManagementDialog';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function UserManagement() {
  const { user } = useAuth();
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
      const response = await fetch(`/api/practices/${user.practiceId}/users`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!user?.practiceId) return;

    try {
      const response = await fetch(`/api/practices/${user.practiceId}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

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

  const roleOptions = [
    { value: 'practice_manager', label: 'Practice Manager', color: 'bg-purple-100 text-purple-800' },
    { value: 'administrator', label: 'Administrator', color: 'bg-blue-100 text-blue-800' },
    { value: 'nurse_lead', label: 'Nurse Lead', color: 'bg-green-100 text-green-800' },
    { value: 'cd_lead_gp', label: 'CD Lead GP', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'estates_lead', label: 'Estates Lead', color: 'bg-orange-100 text-orange-800' },
    { value: 'ig_lead', label: 'IG Lead', color: 'bg-red-100 text-red-800' },
    { value: 'reception_lead', label: 'Reception Lead', color: 'bg-pink-100 text-pink-800' },
    { value: 'gp', label: 'GP', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'nurse', label: 'Nurse', color: 'bg-green-100 text-green-800' },
    { value: 'hca', label: 'HCA', color: 'bg-teal-100 text-teal-800' },
    { value: 'reception', label: 'Reception', color: 'bg-pink-100 text-pink-800' },
    { value: 'cleaner', label: 'Cleaner', color: 'bg-yellow-100 text-yellow-800' },
  ];

  const getRoleLabel = (role: string) => {
    return roleOptions.find(r => r.value === role)?.label || role;
  };

  const getRoleColor = (role: string) => {
    return roleOptions.find(r => r.value === role)?.color || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-spinner">
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
            <h1 className="text-3xl font-bold" data-testid="text-page-title">User Management</h1>
          </div>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions for your practice
          </p>
        </div>
        <Button onClick={handleCreateUser} size="lg" data-testid="button-add-user">
          <UserPlus className="h-5 w-5 mr-2" />
          Add New User
        </Button>
      </div>

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
                data-testid="input-search-users"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => (
          <Card key={u.id} className="hover:shadow-lg transition-shadow" data-testid={`card-user-${u.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-username-${u.id}`}>{u.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {u.isActive !== false ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200" data-testid={`status-active-${u.id}`}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200" data-testid={`status-inactive-${u.id}`}>
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
              <div>
                <p className="text-sm font-medium mb-2">Role:</p>
                <div className="flex flex-wrap gap-2">
                  {u.role ? (
                    <Badge className={getRoleColor(u.role)} data-testid={`badge-role-${u.id}`}>
                      {getRoleLabel(u.role)}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">No role assigned</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEditUser(u)}
                  data-testid={`button-edit-user-${u.id}`}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Edit User
                </Button>
                <Button
                  variant={u.isActive !== false ? "outline" : "default"}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleToggleUserStatus(u.id, u.isActive !== false)}
                  data-testid={`button-toggle-status-${u.id}`}
                >
                  {u.isActive !== false ? 'Deactivate' : 'Activate'}
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
            <h3 className="text-lg font-semibold mb-2" data-testid="text-no-users">No users found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search criteria' : 'Get started by adding your first user'}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateUser} data-testid="button-add-first-user">
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
