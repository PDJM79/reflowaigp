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

async function fetchMFASecret(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_auth_sensitive')
    .select('mfa_secret')
    .eq('user_id', userId)
    .single();
  if (error || !data?.mfa_secret) return null;
  return data.mfa_secret;
}

function verifyTOTPCode(secret: string, userEmail: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: 'ReflowAI GP',
    label: userEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.validate({ token, window: 1 }) !== null;
}

interface MFACodeFormProps {
  code: string;
  loading: boolean;
  onCodeChange: (v: string) => void;
  onVerify: () => void;
  onCancel: () => void;
}

function MFACodeForm({ code, loading, onCodeChange, onVerify, onCancel }: MFACodeFormProps) {
  return (
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
          onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) onVerify(); }}
          className="text-center text-2xl tracking-widest font-mono"
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button className="flex-1" onClick={onVerify} disabled={loading || code.length !== 6}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify
        </Button>
      </div>
    </div>
  );
}

export function MFAVerificationDialog({
  open, onOpenChange, userId, userEmail, onSuccess, onCancel,
}: MFAVerificationDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) { toast.error('Please enter a 6-digit code'); return; }
    setLoading(true);
    try {
      const mfaSecret = await fetchMFASecret(userId);
      if (!mfaSecret) { toast.error('MFA not configured for this account'); return; }
      if (!verifyTOTPCode(mfaSecret, userEmail, code)) {
        toast.error('Invalid verification code');
        setCode('');
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

  const handleCancel = () => { setCode(''); onCancel(); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>Enter the 6-digit code from your authenticator app</DialogDescription>
        </DialogHeader>
        <MFACodeForm
          code={code}
          loading={loading}
          onCodeChange={setCode}
          onVerify={handleVerify}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
