import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldOff, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as OTPAuth from 'otpauth';

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

  const handleDisable = async () => {
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      // Fetch the MFA secret to verify the code
      const { data: mfaData, error: fetchError } = await supabase
        .from('user_auth_sensitive')
        .select('mfa_secret')
        .eq('user_id', userId)
        .single();

      if (fetchError || !mfaData?.mfa_secret) {
        toast.error('MFA not configured');
        setLoading(false);
        return;
      }

      // Verify the TOTP code before disabling
      const totp = new OTPAuth.TOTP({
        issuer: 'ReflowAI GP',
        label: userEmail,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(mfaData.mfa_secret),
      });

      const delta = totp.validate({ token: code, window: 1 });
      
      if (delta === null) {
        toast.error('Invalid verification code');
        setCode('');
        setLoading(false);
        return;
      }

      // Delete the MFA secret
      const { error: deleteError } = await supabase
        .from('user_auth_sensitive')
        .update({ mfa_secret: null })
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Update the mfa_enabled flag
      await supabase
        .from('users')
        .update({ mfa_enabled: false })
        .eq('id', userId);

      toast.success('MFA disabled successfully');
      setCode('');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error disabling MFA:', error);
      toast.error('Failed to disable MFA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
