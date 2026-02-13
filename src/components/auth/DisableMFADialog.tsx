import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldOff, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReauthenticationDialog } from './ReauthenticationDialog';

interface DisableMFADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  onSuccess: () => void;
}

export function DisableMFADialog({ 
  open, 
  onOpenChange, 
  userId,
  userEmail,
  onSuccess 
}: DisableMFADialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReauth, setShowReauth] = useState(false);
  const [verifiedPassword, setVerifiedPassword] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Reset state and show re-auth first
      setCode('');
      setVerifiedPassword(null);
      setShowReauth(true);
    } else {
      setShowReauth(false);
    }
  }, [open]);

  const handleReauthSuccess = (password: string) => {
    setVerifiedPassword(password);
    setShowReauth(false);
  };

  const handleReauthClose = () => {
    setShowReauth(false);
    onOpenChange(false);
  };

  const handleDisable = async () => {
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    if (!verifiedPassword) {
      toast.error('Please complete re-authentication first');
      setShowReauth(true);
      return;
    }

    setLoading(true);
    try {
      // Call the secure edge function to disable MFA
      const { data, error } = await supabase.functions.invoke('manage-mfa-settings', {
        body: {
          action: 'disable',
          userId: userId,
          password: verifiedPassword,
          totpCode: code,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to disable MFA');
      }

      if (data?.error) {
        if (data.error.includes('verification code')) {
          toast.error('Invalid verification code');
          setCode('');
          setLoading(false);
          return;
        }
        throw new Error(data.error);
      }

      toast.success('MFA disabled successfully. You will receive a confirmation email.');
      setCode('');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error disabling MFA:', error);
      toast.error(error.message || 'Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  // Show re-authentication dialog first
  if (showReauth && open) {
    return (
      <ReauthenticationDialog
        open={true}
        onOpenChange={handleReauthClose}
        onSuccess={handleReauthSuccess}
        title="Verify Identity to Disable MFA"
        description="Enter your password to confirm you want to disable Two-Factor Authentication"
      />
    );
  }

  return (
    <Dialog open={open && !showReauth} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-destructive" />
            Disable Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Enter your current MFA code to disable two-factor authentication
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Disabling MFA will make your account less secure. Are you sure you want to continue?
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="disable-mfa-code">Verification Code</Label>
            <Input
              id="disable-mfa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDisable}
              disabled={loading || code.length !== 6}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable MFA
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
