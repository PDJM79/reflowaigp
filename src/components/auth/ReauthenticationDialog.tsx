import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReauthenticationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (password: string) => void;
  title?: string;
  description?: string;
}

export function ReauthenticationDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  title = "Verify Your Identity",
  description = "Please enter your password to continue with this security-sensitive action"
}: ReauthenticationDialogProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user's email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('Unable to verify user session');
      }

      // Attempt to sign in with current credentials to verify password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) {
        setError('Incorrect password. Please try again.');
        setPassword('');
        setLoading(false);
        return;
      }

      // Password verified successfully
      toast.success('Identity verified');
      onSuccess(password);
      setPassword('');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Re-authentication error:', err);
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <KeyRound className="h-4 w-4" />
            <AlertDescription>
              For your security, please re-enter your password to confirm this action.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reauth-password">Password</Label>
            <Input
              id="reauth-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleVerify();
                }
              }}
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleVerify}
              disabled={loading || !password.trim()}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
