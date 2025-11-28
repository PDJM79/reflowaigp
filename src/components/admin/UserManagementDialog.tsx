import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: any;
}

const roleOptions = [
  { value: 'practice_manager', label: 'Practice Manager', description: 'Full system access and administrative rights' },
  { value: 'administrator', label: 'Administrator', description: 'Administrative tasks and user management' },
  { value: 'nurse_lead', label: 'Nurse Lead', description: 'Lead nursing staff, IPC audits' },
  { value: 'cd_lead_gp', label: 'CD Lead GP', description: 'Clinical governance and quality improvement' },
  { value: 'estates_lead', label: 'Estates Lead', description: 'Facilities, fire safety, maintenance' },
  { value: 'ig_lead', label: 'IG Lead', description: 'Information governance, complaints handling' },
  { value: 'reception_lead', label: 'Reception Lead', description: 'Reception team coordination' },
  { value: 'gp', label: 'GP', description: 'General practitioner' },
  { value: 'nurse', label: 'Nurse', description: 'Nursing staff' },
  { value: 'hca', label: 'HCA', description: 'Healthcare assistant' },
  { value: 'reception', label: 'Reception', description: 'Reception staff' },
];

export function UserManagementDialog({ isOpen, onClose, onSuccess, user }: UserManagementDialogProps) {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    selectedRoles: [] as string[],
  });
  const [existingRoles, setExistingRoles] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: '',
        password: '',
        selectedRoles: [],
      });
      fetchUserRoles(user.id);
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        selectedRoles: [],
      });
      setExistingRoles([]);
    }
  }, [user]);

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      const roles = data.map(r => r.role);
      setExistingRoles(roles);
      setFormData(prev => ({ ...prev, selectedRoles: roles }));
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(role)
        ? prev.selectedRoles.filter(r => r !== role)
        : [...prev.selectedRoles, role]
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

    if (formData.selectedRoles.length === 0) {
      toast.error('Please select at least one role');
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id, id')
        .eq('auth_user_id', currentUser?.id)
        .single();

      if (!userData) throw new Error('User not found');

      if (user) {
        // Update existing user roles
        await updateUserRoles(user.id, userData.practice_id);
      } else {
        // Create new user account
        await createNewUser(userData.practice_id);
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

  const updateUserRoles = async (userId: string, practiceId: string) => {
    // Delete removed roles
    const rolesToRemove = existingRoles.filter(r => !formData.selectedRoles.includes(r));
    if (rolesToRemove.length > 0) {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .in('role', rolesToRemove as any);
      if (error) throw error;
    }

    // Add new roles
    const rolesToAdd = formData.selectedRoles.filter(r => !existingRoles.includes(r));
    if (rolesToAdd.length > 0) {
      const { error } = await supabase
        .from('user_roles')
        .insert(
          rolesToAdd.map(role => ({
            user_id: userId,
            role: role as any,
            practice_id: practiceId,
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

  const createNewUser = async (practiceId: string) => {
    // Call edge function to create user account
    const { data, error } = await supabase.functions.invoke('create-user-accounts', {
      body: {
        email: formData.email,
        name: formData.name,
        role: formData.selectedRoles[0], // Primary role for user metadata
        practice_id: practiceId,
        password: formData.password || undefined,
      }
    });

    if (error) throw error;

    // Add additional roles to user_roles table
    if (formData.selectedRoles.length > 1 && data.user_id) {
      const additionalRoles = formData.selectedRoles.slice(1);
      const { error: rolesError } = await supabase
        .from('user_roles')
        .insert(
          additionalRoles.map(role => ({
            user_id: data.user_id,
            role: role as any,
            practice_id: practiceId,
          }))
        );
      if (rolesError) throw rolesError;
    }
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
            <div className="border rounded-lg p-4 space-y-3 max-h-[300px] overflow-y-auto">
              {roleOptions.map((role) => (
                <div key={role.value} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded">
                  <Checkbox
                    id={role.value}
                    checked={formData.selectedRoles.includes(role.value)}
                    onCheckedChange={() => handleRoleToggle(role.value)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={role.value}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {role.label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {role.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
