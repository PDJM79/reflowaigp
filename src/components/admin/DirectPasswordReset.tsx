import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function DirectPasswordReset() {
  const [resetting, setResetting] = useState(false);

  const resetPhilPassword = async () => {
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: {
          email: 'philmeyers69@gmail.com',
          newPassword: 'Password'
        }
      });

      if (error) {
        console.error('Error resetting password:', error);
        toast.error(`Failed to reset password: ${error.message}`);
        return;
      }

      toast.success('Password successfully reset for philmeyers69@gmail.com to "Password"');
      console.log('Password reset result:', data);
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Reset Phil's Password
          </CardTitle>
          <CardDescription>
            Direct password reset for philmeyers69@gmail.com
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Email:</strong> philmeyers69@gmail.com</p>
              <p><strong>New Password:</strong> Password</p>
            </div>
            
            <Button 
              onClick={resetPhilPassword}
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
                  Reset Password Now
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground text-center">
              After reset, you can login with Password
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}