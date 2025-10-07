import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function PasswordReset() {
  const [email, setEmail] = useState('philmeyers69@gmail.com');
  const [newPassword, setNewPassword] = useState('Password');
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

    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: {
          email: email.trim(),
          newPassword: newPassword.trim()
        }
      });

      if (error) {
        console.error('Error resetting password:', error);
        toast.error('Failed to reset password');
        return;
      }

      toast.success(`Password successfully reset for ${email}`);
      setLastResetEmail(email.trim());
      setLastResetPassword(newPassword.trim());
      console.log('Password reset result:', data);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
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
            />
          </div>
          
          <Button 
            onClick={resetPassword}
            disabled={resetting}
            className="w-full"
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