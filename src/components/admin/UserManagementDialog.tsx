import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePracticeSelection } from '@/hooks/usePracticeSelection';
import { useRoleCatalog } from '@/hooks/useRoleCatalog';
import type { PracticeRole } from '@/types/roles';

interface UserManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: any;
}

export function UserManagementDialog({ isOpen, onClose, onSuccess, user }: UserManagementDialogProps) {
  const { user: currentUser } = useAuth();
  const { selectedPracticeId } = usePracticeSelection();
  const { practiceRoles, practiceRolesLoading, getActivePracticeRoles } = useRoleCatalog();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    selectedPracticeRoleIds: [] as string[],
  });
  const [existingRoleIds, setExistingRoleIds] = useState<string[]>([]);

  const activePracticeRoles = getActivePracticeRoles();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: '',
        password: '',
        selectedPracticeRoleIds: [],
      });
      fetchUserRoles(user.id);
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        selectedPracticeRoleIds: [],
      });
      setExistingRoleIds([]);
    }
  }, [user, isOpen]);

  const fetchUserRoles = async (userId: string) => {
    if (!selectedPracticeId) return;

    try {
      const { data, error } = await supabase
        .from('user_practice_roles')
        .select('practice_role_id')
        .eq('user_id', userId)
        .eq('practice_id', selectedPracticeId);

      if (error) throw error;
      
      const roleIds = (data || []).map(r => r.practice_role_id);
      setExistingRoleIds(roleIds);
      setFormData(prev => ({ ...prev, selectedPracticeRoleIds: roleIds }));
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const handleRoleToggle = (practiceRoleId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPracticeRoleIds: prev.selectedPracticeRoleIds.includes(practiceRoleId)
        ? prev.selectedPracticeRoleIds.filter(id => id !== practiceRoleId)
        : [...prev.selectedPracticeRoleIds, practiceRoleId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!user && !formData.email.trim()) {
      toast.error('Email is required for new users');
      return;
    }

    if (formData.selectedPracticeRoleIds.length === 0) {
      toast.error('Please select at least one role');
      return;
    }

    if (!selectedPracticeId) {
      toast.error('No practice selected');
      return;
    }

    setLoading(true);

    try {
      if (user) {
        await updateUserRoles(user.id);
      } else {
        await createNewUser();
      }

      toast.success(user ? 'User roles updated successfully' : 'User created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRoles = async (userId: string) => {
    if (!selectedPracticeId) return;

    // Delete removed roles
    const rolesToRemove = existingRoleIds.filter(id => !formData.selectedPracticeRoleIds.includes(id));
    if (rolesToRemove.length > 0) {
      const { error } = await supabase
        .from('user_practice_roles')
        .delete()
        .eq('user_id', userId)
        .eq('practice_id', selectedPracticeId)
        .in('practice_role_id', rolesToRemove);
      if (error) throw error;
    }

    // Add new roles
    const rolesToAdd = formData.selectedPracticeRoleIds.filter(id => !existingRoleIds.includes(id));
    if (rolesToAdd.length > 0) {
      const { error } = await supabase
        .from('user_practice_roles')
        .insert(
          rolesToAdd.map(practiceRoleId => ({
            user_id: userId,
            practice_id: selectedPracticeId,
            practice_role_id: practiceRoleId,
          }))
        );
      if (error) throw error;
    }

    // Update name if changed
    if (formData.name !== user.name) {
      const { error } = await supabase
        .from('users')
        .update({ name: formData.name })
        .eq('id', userId);
      if (error) throw error;
    }
  };

  const createNewUser = async () => {
    if (!selectedPracticeId) return;

    // Get primary role for user metadata
    const primaryRole = activePracticeRoles.find(
      pr => pr.id === formData.selectedPracticeRoleIds[0]
    );
    const roleKey = primaryRole?.role_catalog?.role_key || 'user';

    // Call edge function to create user account
    const { data, error } = await supabase.functions.invoke('create-user-accounts', {
      body: {
        email: formData.email,
        name: formData.name,
        role: roleKey,
        practice_id: selectedPracticeId,
        password: formData.password || undefined,
      }
    });

    if (error) throw error;

    // Add roles to user_practice_roles table
    if (data?.user_id && formData.selectedPracticeRoleIds.length > 0) {
      const { error: rolesError } = await supabase
        .from('user_practice_roles')
        .insert(
          formData.selectedPracticeRoleIds.map(practiceRoleId => ({
            user_id: data.user_id,
            practice_id: selectedPracticeId,
            practice_role_id: practiceRoleId,
          }))
        );
      if (rolesError) throw rolesError;
    }
  };

  const getCategoryColor = (category: string | undefined): string => {
    const colors: Record<string, string> = {
      clinical: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      governance: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      it: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      support: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      pcn: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    };
    return colors[category || 'support'] || colors.support;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {user ? 'Edit User Roles' : 'Create New User'}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {user ? 'Update roles and permissions for this user' : 'Add a new user account with roles and permissions'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                className="h-11"
                required
              />
            </div>

            {!user && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    className="h-11"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base">Initial Password</Label>
                  <Input
                    id="password"
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave blank to auto-generate"
                    className="h-11"
                  />
                  <p className="text-sm text-muted-foreground">
                    If left blank, a secure password will be generated automatically
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="text-base">User Roles * (Select one or more)</Label>
            {practiceRolesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : activePracticeRoles.length === 0 ? (
              <div className="border rounded-lg p-4 text-center text-muted-foreground">
                <p>No roles have been enabled for this practice yet.</p>
                <p className="text-sm mt-1">Go to Role Management to enable roles.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-3">
                  {activePracticeRoles.map((practiceRole) => {
                    const roleInfo = practiceRole.role_catalog;
                    if (!roleInfo) return null;

                    return (
                      <div
                        key={practiceRole.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg transition-colors cursor-pointer ${
                          formData.selectedPracticeRoleIds.includes(practiceRole.id)
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-muted/50 border border-transparent'
                        }`}
                        onClick={() => handleRoleToggle(practiceRole.id)}
                      >
                        <Checkbox
                          id={practiceRole.id}
                          checked={formData.selectedPracticeRoleIds.includes(practiceRole.id)}
                          onCheckedChange={() => handleRoleToggle(practiceRole.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor={practiceRole.id}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {roleInfo.display_name}
                            </label>
                            <Badge variant="outline" className={getCategoryColor(roleInfo.category)}>
                              {roleInfo.category}
                            </Badge>
                          </div>
                          {roleInfo.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {roleInfo.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || activePracticeRoles.length === 0}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
