import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
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
  { value: 'cleaner', label: 'Cleaner', description: 'Cleaning staff' },
];

export function UserManagementDialog({ isOpen, onClose, onSuccess, user }: UserManagementDialogProps) {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: '',
        password: '',
        role: user.role || '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: '',
      });
    }
  }, [user]);

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

    if (!formData.role) {
      toast.error('Please select a role');
      return;
    }

    if (!currentUser?.practiceId) {
      toast.error('Practice not found');
      return;
    }

    setLoading(true);

    try {
      if (user) {
        const response = await fetch(`/api/practices/${currentUser.practiceId}/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            role: formData.role,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to update user');
        }
      } else {
        const response = await fetch(`/api/practices/${currentUser.practiceId}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password || undefined,
            role: formData.role,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to create user');
        }
      }

      toast.success(user ? 'User updated successfully' : 'User created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl" data-testid="text-dialog-title">
            {user ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {user ? 'Update details and role for this user' : 'Add a new user account with a role'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-user-management">
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
                data-testid="input-user-name"
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
                    data-testid="input-user-email"
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
                    data-testid="input-user-password"
                  />
                  <p className="text-sm text-muted-foreground">
                    If left blank, a secure password will be generated automatically
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-base">User Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
              data-testid="select-user-role"
            >
              <SelectTrigger className="h-11" data-testid="select-trigger-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role.value} value={role.value} data-testid={`select-role-${role.value}`}>
                    <div className="flex flex-col">
                      <span>{role.label}</span>
                      <span className="text-xs text-muted-foreground">{role.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="w-full sm:w-auto min-h-[44px]"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full sm:w-auto min-h-[44px]"
              data-testid="button-submit"
            >
              {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
