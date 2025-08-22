import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function PasswordReset() {
  const [email, setEmail] = useState('philmeyers69@gmail.com');
  const [newPassword, setNewPassword] = useState('Password');
  const [resetting, setResetting] = useState(false);

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
        </div>
      </CardContent>
    </Card>
  );
}