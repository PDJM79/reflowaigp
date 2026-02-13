import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as OTPAuth from 'otpauth';

interface MFAVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MFAVerificationDialog({ 
  open, 
  onOpenChange, 
  userId,
  userEmail,
  onSuccess, 
  onCancel 
}: MFAVerificationDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      // Fetch the MFA secret from user_auth_sensitive
      const { data: mfaData, error: fetchError } = await supabase
        .from('user_auth_sensitive')
        .select('mfa_secret')
        .eq('user_id', userId)
        .single();

      if (fetchError || !mfaData?.mfa_secret) {
        toast.error('MFA not configured for this account');
        setLoading(false);
        return;
      }

      // Verify the TOTP code
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

      toast.success('MFA verification successful');
      onSuccess();
    } catch (error: any) {
      console.error('MFA verification error:', error);
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCode('');
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Enter the 6-digit code from your authenticator app
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Verification Code</Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length === 6) {
                  handleVerify();
                }
              }}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleVerify}
              disabled={loading || code.length !== 6}
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
