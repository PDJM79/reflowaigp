import React, { useState, useEffect } from 'react';
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

const CATEGORY_COLORS: Record<string, string> = {
  clinical: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  governance: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  it: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  support: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  pcn: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
};

interface RoleSelectionListProps {
  activePracticeRoles: PracticeRole[];
  selectedPracticeRoleIds: string[];
  onToggle: (id: string) => void;
}

function RoleSelectionList({ activePracticeRoles, selectedPracticeRoleIds, onToggle }: RoleSelectionListProps) {
  return (
    <ScrollArea className="h-[300px] border rounded-lg p-4">
      <div className="space-y-3">
        {activePracticeRoles.map((practiceRole) => {
          const roleInfo = practiceRole.role_catalog;
          if (!roleInfo) return null;
          return (
            <div
              key={practiceRole.id}
              className={`flex items-start space-x-3 p-3 rounded-lg transition-colors cursor-pointer ${
                selectedPracticeRoleIds.includes(practiceRole.id)
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted/50 border border-transparent'
              }`}
              onClick={() => onToggle(practiceRole.id)}
            >
              <Checkbox
                id={practiceRole.id}
                checked={selectedPracticeRoleIds.includes(practiceRole.id)}
                onCheckedChange={() => onToggle(practiceRole.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <label htmlFor={practiceRole.id} className="text-sm font-medium leading-none cursor-pointer">
                    {roleInfo.display_name}
                  </label>
                  <Badge variant="outline" className={CATEGORY_COLORS[roleInfo.category || 'support'] || CATEGORY_COLORS.support}>
                    {roleInfo.category}
                  </Badge>
                </div>
                {roleInfo.description && (
                  <p className="text-xs text-muted-foreground mt-1">{roleInfo.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

interface NewUserFieldsProps {
  email: string;
  password: string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
}

function NewUserFields({ email, password, onEmailChange, onPasswordChange }: NewUserFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-base">Email Address *</Label>
        <Input id="email" type="email" value={email} onChange={(e) => onEmailChange(e.target.value)}
          placeholder="user@example.com" className="h-11" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-base">Initial Password</Label>
        <Input id="password" type="text" value={password} onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Leave blank to auto-generate" className="h-11" />
        <p className="text-sm text-muted-foreground">If left blank, a secure password will be generated automatically</p>
      </div>
    </>
  );
}

async function fetchUserRoles(
  userId: string,
  selectedPracticeId: string,
  setExistingRoleIds: (ids: string[]) => void,
  setFormData: (fn: (prev: any) => any) => void
): Promise<void> {
  const { data, error } = await supabase
    .from('user_practice_roles')
    .select('practice_role_id')
    .eq('user_id', userId)
    .eq('practice_id', selectedPracticeId);
  if (error) throw error;
  const roleIds = (data || []).map((r: any) => r.practice_role_id);
  setExistingRoleIds(roleIds);
  setFormData((prev: any) => ({ ...prev, selectedPracticeRoleIds: roleIds }));
}

async function updateUserRoles(params: {
  userId: string;
  selectedPracticeId: string;
  existingRoleIds: string[];
  newRoleIds: string[];
  newName: string;
  currentName: string;
}): Promise<void> {
  const { userId, selectedPracticeId, existingRoleIds, newRoleIds, newName, currentName } = params;
  const rolesToRemove = existingRoleIds.filter(id => !newRoleIds.includes(id));
  if (rolesToRemove.length > 0) {
    const { error } = await supabase.from('user_practice_roles').delete()
      .eq('user_id', userId).eq('practice_id', selectedPracticeId).in('practice_role_id', rolesToRemove);
    if (error) throw error;
  }
  const rolesToAdd = newRoleIds.filter(id => !existingRoleIds.includes(id));
  if (rolesToAdd.length > 0) {
    const { error } = await supabase.from('user_practice_roles')
      .insert(rolesToAdd.map(practiceRoleId => ({ user_id: userId, practice_id: selectedPracticeId, practice_role_id: practiceRoleId })));
    if (error) throw error;
  }
  if (newName !== currentName) {
    const { error } = await supabase.from('users').update({ name: newName }).eq('id', userId);
    if (error) throw error;
  }
}

async function createNewUser(params: {
  selectedPracticeId: string;
  email: string;
  name: string;
  password: string;
  selectedPracticeRoleIds: string[];
  activePracticeRoles: PracticeRole[];
}): Promise<void> {
  const { selectedPracticeId, email, name, password, selectedPracticeRoleIds, activePracticeRoles } = params;
  const primaryRole = activePracticeRoles.find(pr => pr.id === selectedPracticeRoleIds[0]);
  const roleKey = primaryRole?.role_catalog?.role_key || 'user';
  const { data, error } = await supabase.functions.invoke('create-user-accounts', {
    body: { email, name, role: roleKey, practice_id: selectedPracticeId, password: password || undefined },
  });
  if (error) throw error;
  if (data?.user_id && selectedPracticeRoleIds.length > 0) {
    const { error: rolesError } = await supabase.from('user_practice_roles')
      .insert(selectedPracticeRoleIds.map(practiceRoleId => ({
        user_id: data.user_id, practice_id: selectedPracticeId, practice_role_id: practiceRoleId,
      })));
    if (rolesError) throw rolesError;
  }
}

interface SubmitUserFormParams {
  user: any;
  formData: { name: string; email: string; password: string; selectedPracticeRoleIds: string[] };
  existingRoleIds: string[];
  activePracticeRoles: PracticeRole[];
  selectedPracticeId: string | null;
  onSuccess: () => void;
  onClose: () => void;
  setLoading: (v: boolean) => void;
}

async function submitUserForm(params: SubmitUserFormParams): Promise<void> {
  const { user, formData, existingRoleIds, activePracticeRoles, selectedPracticeId, onSuccess, onClose, setLoading } = params;
  if (!formData.name.trim()) { toast.error('Name is required'); return; }
  if (!user && !formData.email.trim()) { toast.error('Email is required for new users'); return; }
  if (formData.selectedPracticeRoleIds.length === 0) { toast.error('Please select at least one role'); return; }
  if (!selectedPracticeId) { toast.error('No practice selected'); return; }
  setLoading(true);
  try {
    if (user) {
      await updateUserRoles({ userId: user.id, selectedPracticeId, existingRoleIds,
        newRoleIds: formData.selectedPracticeRoleIds, newName: formData.name, currentName: user.name });
    } else {
      await createNewUser({ selectedPracticeId, email: formData.email, name: formData.name,
        password: formData.password, selectedPracticeRoleIds: formData.selectedPracticeRoleIds, activePracticeRoles });
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
}

interface UserFormContentProps {
  formData: { name: string; email: string; password: string; selectedPracticeRoleIds: string[] };
  user: any;
  loading: boolean;
  activePracticeRoles: PracticeRole[];
  practiceRolesLoading: boolean;
  onFormDataChange: (d: any) => void;
  onRoleToggle: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function UserFormContent({
  formData, user, loading, activePracticeRoles, practiceRolesLoading,
  onFormDataChange, onRoleToggle, onSubmit, onCancel,
}: UserFormContentProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-base">Full Name *</Label>
          <Input id="name" value={formData.name} onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
            placeholder="Enter full name" className="h-11" required />
        </div>
        {!user && (
          <NewUserFields
            email={formData.email}
            password={formData.password}
            onEmailChange={(v) => onFormDataChange({ ...formData, email: v })}
            onPasswordChange={(v) => onFormDataChange({ ...formData, password: v })}
          />
        )}
      </div>
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
          <RoleSelectionList
            activePracticeRoles={activePracticeRoles}
            selectedPracticeRoleIds={formData.selectedPracticeRoleIds}
            onToggle={onRoleToggle}
          />
        )}
      </div>
      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto min-h-[44px]">Cancel</Button>
        <Button type="submit" disabled={loading || activePracticeRoles.length === 0} className="w-full sm:w-auto min-h-[44px]">
          {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
        </Button>
      </DialogFooter>
    </form>
  );
}

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
  const [formData, setFormData] = useState({ name: '', email: '', password: '', selectedPracticeRoleIds: [] as string[] });
  const [existingRoleIds, setExistingRoleIds] = useState<string[]>([]);
  const activePracticeRoles = getActivePracticeRoles();

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', email: '', password: '', selectedPracticeRoleIds: [] });
      if (selectedPracticeId) {
        fetchUserRoles(user.id, selectedPracticeId, setExistingRoleIds, setFormData).catch(error => {
          console.error('Error fetching user roles:', error);
          toast.error('Could not load current role assignments');
        });
      }
    } else {
      setFormData({ name: '', email: '', password: '', selectedPracticeRoleIds: [] });
      setExistingRoleIds([]);
    }
  }, [user, isOpen]);

  const handleRoleToggle = (practiceRoleId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPracticeRoleIds: prev.selectedPracticeRoleIds.includes(practiceRoleId)
        ? prev.selectedPracticeRoleIds.filter(id => id !== practiceRoleId)
        : [...prev.selectedPracticeRoleIds, practiceRoleId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitUserForm({ user, formData, existingRoleIds, activePracticeRoles, selectedPracticeId, onSuccess, onClose, setLoading });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{user ? 'Edit User Roles' : 'Create New User'}</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {user ? 'Update roles and permissions for this user' : 'Add a new user account with roles and permissions'}
          </DialogDescription>
        </DialogHeader>
        <UserFormContent
          formData={formData}
          user={user}
          loading={loading}
          activePracticeRoles={activePracticeRoles}
          practiceRolesLoading={practiceRolesLoading}
          onFormDataChange={setFormData}
          onRoleToggle={handleRoleToggle}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
