import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Copy, Check, QrCode, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import * as OTPAuth from 'otpauth';
import { ReauthenticationDialog } from './ReauthenticationDialog';

interface MFASetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  userId?: string;
  onSuccess: () => void;
}

async function generateMFASecret(userEmail: string): Promise<{ secretBase32: string; qrUrl: string }> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(20));
  const secret = new OTPAuth.Secret({ buffer: randomBytes.buffer });
  const totp = new OTPAuth.TOTP({
    issuer: 'ReflowAI GP',
    label: userEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });
  const secretBase32 = totp.secret.base32;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totp.toString())}`;
  return { secretBase32, qrUrl };
}

async function saveMFAToEdgeFunction(params: {
  targetUserId: string;
  verifiedPassword: string;
  secret: string;
  verificationCode: string;
  userEmail: string;
}): Promise<void> {
  const totp = new OTPAuth.TOTP({
    issuer: 'ReflowAI GP',
    label: params.userEmail,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(params.secret),
  });
  if (totp.validate({ token: params.verificationCode, window: 1 }) === null) {
    throw new Error('Invalid verification code. Please try again.');
  }
  const { data, error } = await supabase.functions.invoke('manage-mfa-settings', {
    body: {
      action: 'enable',
      userId: params.targetUserId,
      password: params.verifiedPassword,
      mfaSecret: params.secret,
      totpCode: params.verificationCode,
    },
  });
  if (error) {
    console.error('Edge function error:', error);
    throw new Error(error.message || 'Failed to enable MFA');
  }
  if (data?.error) throw new Error(data.error);
}

function useMFASetup(
  open: boolean,
  onOpenChange: (open: boolean) => void,
  userEmail: string,
  userId: string | undefined,
  sessionUserId: string | undefined,
  onSuccess: () => void
) {
  const [step, setStep] = useState<'reauth' | 'generate' | 'verify'>('reauth');
  const [secret, setSecret] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifiedPassword, setVerifiedPassword] = useState<string | null>(null);
  const [showReauth, setShowReauth] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('reauth'); setSecret(''); setQrDataUrl('');
      setVerificationCode(''); setVerifiedPassword(null); setShowReauth(true);
    } else {
      setShowReauth(false);
    }
  }, [open]);

  const handleReauthSuccess = async (password: string) => {
    setVerifiedPassword(password);
    setShowReauth(false);
    setStep('generate');
    try {
      const { secretBase32, qrUrl } = await generateMFASecret(userEmail);
      setSecret(secretBase32);
      setQrDataUrl(qrUrl);
    } catch (error) {
      console.error('Error generating MFA secret:', error);
      toast.error('Failed to generate MFA setup');
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy secret');
    }
  };

  const verifyAndSave = async () => {
    if (verificationCode.length !== 6) { toast.error('Please enter a 6-digit code'); return; }
    if (!verifiedPassword) { toast.error('Please complete re-authentication first'); setStep('reauth'); setShowReauth(true); return; }
    const targetUserId = userId ?? sessionUserId;
    if (!targetUserId) { toast.error('Not authenticated'); return; }
    setLoading(true);
    try {
      await saveMFAToEdgeFunction({ targetUserId, verifiedPassword, secret, verificationCode, userEmail });
      toast.success('MFA enabled successfully! You will receive a confirmation email.');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving MFA:', error);
      toast.error(error.message || 'Failed to enable MFA');
    } finally {
      setLoading(false);
    }
  };

  return { step, setStep, secret, qrDataUrl, verificationCode, setVerificationCode, loading, copied, showReauth,
    handleReauthSuccess, handleReauthClose: () => { setShowReauth(false); onOpenChange(false); }, copySecret, verifyAndSave };
}

interface MFAGenerateStepProps {
  qrDataUrl: string;
  secret: string;
  copied: boolean;
  onCopy: () => void;
  onContinue: () => void;
}

function MFAGenerateStep({ qrDataUrl, secret, copied, onCopy, onContinue }: MFAGenerateStepProps) {
  return (
    <>
      <Alert>
        <QrCode className="h-4 w-4" />
        <AlertDescription>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</AlertDescription>
      </Alert>
      <div className="flex justify-center p-4 bg-white rounded-lg">
        {qrDataUrl
          ? <img src={qrDataUrl} alt="MFA QR Code" className="w-48 h-48" />
          : <div className="w-48 h-48 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}
      </div>
      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Or manually enter this secret key:</Label>
        <div className="flex gap-2">
          <Input value={secret} readOnly className="font-mono text-sm" />
          <Button variant="outline" size="icon" onClick={onCopy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <Button className="w-full" onClick={onContinue} disabled={!secret}>Continue to Verification</Button>
    </>
  );
}

interface MFAVerifyStepProps {
  verificationCode: string;
  loading: boolean;
  onCodeChange: (v: string) => void;
  onBack: () => void;
  onEnable: () => void;
}

function MFAVerifyStep({ verificationCode, loading, onCodeChange, onBack, onEnable }: MFAVerifyStepProps) {
  return (
    <>
      <Alert variant="default">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Enter the 6-digit code from your authenticator app to confirm setup</AlertDescription>
      </Alert>
      <div className="space-y-2">
        <Label htmlFor="verification-code">Verification Code</Label>
        <Input
          id="verification-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          value={verificationCode}
          onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ''))}
          className="text-center text-2xl tracking-widest font-mono"
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack} disabled={loading}>Back</Button>
        <Button className="flex-1" onClick={onEnable} disabled={loading || verificationCode.length !== 6}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enable MFA
        </Button>
      </div>
    </>
  );
}

export function MFASetupDialog({ open, onOpenChange, userEmail, userId, onSuccess }: MFASetupDialogProps) {
  const { user: sessionUser } = useAuth();
  const mfa = useMFASetup(open, onOpenChange, userEmail, userId, sessionUser?.id, onSuccess);

  if (mfa.showReauth && open) {
    return (
      <ReauthenticationDialog
        open={true}
        onOpenChange={mfa.handleReauthClose}
        onSuccess={mfa.handleReauthSuccess}
        title="Verify Identity for MFA Setup"
        description="Enter your password to begin setting up Two-Factor Authentication"
      />
    );
  }

  return (
    <Dialog open={open && mfa.step !== 'reauth'} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Set Up Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>Protect your account with an authenticator app</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {mfa.step === 'generate' && (
            <MFAGenerateStep
              qrDataUrl={mfa.qrDataUrl}
              secret={mfa.secret}
              copied={mfa.copied}
              onCopy={mfa.copySecret}
              onContinue={() => mfa.setStep('verify')}
            />
          )}
          {mfa.step === 'verify' && (
            <MFAVerifyStep
              verificationCode={mfa.verificationCode}
              loading={mfa.loading}
              onCodeChange={mfa.setVerificationCode}
              onBack={() => mfa.setStep('generate')}
              onEnable={mfa.verifyAndSave}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
