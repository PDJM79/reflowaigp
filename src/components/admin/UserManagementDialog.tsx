import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePracticeSelection } from '@/hooks/usePracticeSelection';
import { useRoleCatalog } from '@/hooks/useRoleCatalog';

interface UserManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: any;
}

// Fallback when the practice-roles catalog is unavailable: the core user roles
// understood by the session-auth backend (users.role enum).
const FALLBACK_ROLES: { value: string; label: string }[] = [
  { value: 'practice_manager', label: 'Practice Manager' },
  { value: 'cd_lead_gp', label: 'CD Lead GP' },
  { value: 'nurse_lead', label: 'Nurse Lead' },
  { value: 'ig_lead', label: 'IG Lead' },
  { value: 'estates_lead', label: 'Estates Lead' },
  { value: 'reception_lead', label: 'Reception Lead' },
  { value: 'gp', label: 'GP' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'hca', label: 'HCA' },
  { value: 'reception', label: 'Reception' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'cleaner', label: 'Cleaner' },
];

export function UserManagementDialog({ isOpen, onClose, onSuccess, user }: UserManagementDialogProps) {
  const { user: currentUser } = useAuth();
  const { selectedPracticeId } = usePracticeSelection();
  const { practiceRolesLoading, getActivePracticeRoles } = useRoleCatalog();

  const practiceId = currentUser?.practiceId || selectedPracticeId;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    selectedPracticeRoleIds: [] as string[],
  });
  const [existingRoleIds, setExistingRoleIds] = useState<string[]>([]);

  const activePracticeRoles = getActivePracticeRoles();
  // The practice-roles catalog is loaded via the Supabase client; with
  // session-based auth it may be unavailable, so fall back to core roles.
  const useFallbackRoles = !practiceRolesLoading && activePracticeRoles.length === 0;

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: '',
        password: '',
        role: user.role || '',
        selectedPracticeRoleIds: [],
      });
      fetchUserRoles(user.id);
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: '',
        selectedPracticeRoleIds: [],
      });
      setExistingRoleIds([]);
    }
  }, [user, isOpen]);

  const fetchUserRoles = async (userId: string) => {
    if (!practiceId) return;

    try {
      const { data, error } = await supabase
        .from('user_practice_roles')
        .select('practice_role_id')
        .eq('user_id', userId)
        .eq('practice_id', practiceId);

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

  const getPrimaryRoleKey = (): string => {
    if (useFallbackRoles) return formData.role;
    const primaryRole = activePracticeRoles.find(
      pr => pr.id === formData.selectedPracticeRoleIds[0]
    );
    return primaryRole?.role_catalog?.role_key || '';
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

    const roleSelected = useFallbackRoles
      ? formData.role !== ''
      : formData.selectedPracticeRoleIds.length > 0;
    if (!roleSelected) {
      toast.error('Please select at least one role');
      return;
    }

    if (!practiceId) {
      toast.error('No practice selected');
      return;
    }

    setLoading(true);

    try {
      if (user) {
        await updateExistingUser(user.id);
        toast.success('User updated successfully');
      } else {
        await createNewUser();
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const updateExistingUser = async (userId: string) => {
    if (!practiceId) return;

    const roleKey = getPrimaryRoleKey();
    const res = await fetch(`/api/practices/${practiceId}/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: formData.name,
        ...(roleKey ? { role: roleKey, isPracticeManager: roleKey === 'practice_manager' } : {}),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(typeof err?.error === 'string' ? err.error : 'Failed to update user');
    }

    if (!useFallbackRoles) {
      await syncPracticeRoleBadges(userId);
    }
  };

  // Best-effort sync of the practice-role badge system (Supabase-backed).
  // Failures here must not report the whole operation as failed.
  const syncPracticeRoleBadges = async (userId: string) => {
    try {
      const rolesToRemove = existingRoleIds.filter(id => !formData.selectedPracticeRoleIds.includes(id));
      if (rolesToRemove.length > 0) {
        const { error } = await supabase
          .from('user_practice_roles')
          .delete()
          .eq('user_id', userId)
          .eq('practice_id', practiceId)
          .in('practice_role_id', rolesToRemove);
        if (error) throw error;
      }

      const rolesToAdd = formData.selectedPracticeRoleIds.filter(id => !existingRoleIds.includes(id));
      if (rolesToAdd.length > 0) {
        const { error } = await supabase
          .from('user_practice_roles')
          .insert(
            rolesToAdd.map(practiceRoleId => ({
              user_id: userId,
              practice_id: practiceId,
              practice_role_id: practiceRoleId,
            }))
          );
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error syncing practice role badges:', error);
      toast.warning('User saved, but role badges could not be updated. Use Role Management to retry.');
    }
  };

  const createNewUser = async () => {
    if (!practiceId) return;

    const roleKey = getPrimaryRoleKey();

    const res = await fetch(`/api/practices/${practiceId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        role: roleKey,
        isPracticeManager: roleKey === 'practice_manager',
        isActive: true,
        password: formData.password || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      const message = typeof err?.error === 'string'
        ? err.error
        : 'Failed to create user';
      throw new Error(message);
    }

    const created = await res.json();

    if (created.temporaryPassword) {
      toast.success(
        `User created. Temporary password: ${created.temporaryPassword}`,
        {
          description: 'Copy it now and share it securely — it will not be shown again.',
          duration: 30000,
        }
      );
    } else {
      toast.success('User created successfully');
    }

    if (!useFallbackRoles && created.id) {
      await syncPracticeRoleBadges(created.id);
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
            {user ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {user ? 'Update details and roles for this user' : 'Add a new user account with roles and permissions'}
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
                    Must be 12+ characters with uppercase, lowercase, a number and a special
                    character. If left blank, a secure password will be generated.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="text-base">
              {useFallbackRoles ? 'User Role *' : 'User Roles * (Select one or more)'}
            </Label>
            {practiceRolesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : useFallbackRoles ? (
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {FALLBACK_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value} className="py-3">
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              disabled={loading}
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
