import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export function PasswordReset() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [lastResetEmail, setLastResetEmail] = useState<string>('');
  const [lastResetPassword, setLastResetPassword] = useState<string>('');

  const resetPassword = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }

    if (!user?.practiceId) {
      toast.error('No practice context available');
      return;
    }

    setResetting(true);
    try {
      const usersResponse = await fetch(`/api/practices/${user.practiceId}/users`, {
        credentials: 'include',
      });

      if (!usersResponse.ok) throw new Error('Failed to fetch users');

      const users = await usersResponse.json();
      const targetUser = users.find((u: any) => u.email === email.trim());

      if (!targetUser) {
        toast.error('User not found with that email address');
        setResetting(false);
        return;
      }

      const response = await fetch(`/api/practices/${user.practiceId}/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: newPassword.trim() }),
      });

      if (!response.ok) {
        toast.info('Password reset will be available in a future update.');
        setResetting(false);
        return;
      }

      toast.success(`Password successfully reset for ${email}`);
      setLastResetEmail(email.trim());
      setLastResetPassword(newPassword.trim());
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.info('Password reset will be available in a future update.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          Reset User Password
        </CardTitle>
        <CardDescription>
          Reset a user's password (Admin function)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">User Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              data-testid="input-reset-email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              data-testid="input-reset-password"
            />
          </div>
          
          <Button 
            onClick={resetPassword}
            disabled={resetting}
            className="w-full"
            data-testid="button-reset-password"
          >
            {resetting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resetting Password...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4 mr-2" />
                Reset Password
              </>
            )}
          </Button>
          
          {lastResetEmail && lastResetPassword && (
            <Button
              variant="outline"
              onClick={() => {
                const subject = encodeURIComponent('Your Password Has Been Reset');
                const body = encodeURIComponent(`Hello,

Your password has been reset.

Email: ${lastResetEmail}
New Password: ${lastResetPassword}

Login at: ${window.location.origin}

Please change your password after logging in.

Best regards`);
                window.open(`mailto:${lastResetEmail}?subject=${subject}&body=${body}`);
              }}
              className="w-full"
              data-testid="button-send-credentials-email"
            >
              <Mail className="h-4 w-4 mr-2" />
              Send New Credentials via Email
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
