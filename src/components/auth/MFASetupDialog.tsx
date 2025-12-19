import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Copy, Check, QrCode, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as OTPAuth from 'otpauth';
import { ReauthenticationDialog } from './ReauthenticationDialog';

interface MFASetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  userId?: string; // Optional: for admin setting up MFA for another user
  onSuccess: () => void;
}

export function MFASetupDialog({ open, onOpenChange, userEmail, userId, onSuccess }: MFASetupDialogProps) {
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
      // Reset state when dialog opens
      setStep('reauth');
      setSecret('');
      setQrDataUrl('');
      setVerificationCode('');
      setVerifiedPassword(null);
      setShowReauth(true);
    } else {
      setShowReauth(false);
    }
  }, [open]);

  const handleReauthSuccess = (password: string) => {
    setVerifiedPassword(password);
    setShowReauth(false);
    setStep('generate');
    generateSecret();
  };

  const handleReauthClose = () => {
    setShowReauth(false);
    onOpenChange(false);
  };

  const generateSecret = async () => {
    try {
      // Generate a random secret
      const randomBytes = crypto.getRandomValues(new Uint8Array(20));
      const secret = new OTPAuth.Secret({ buffer: randomBytes.buffer });
      
      // Create TOTP instance
      const totp = new OTPAuth.TOTP({
        issuer: 'ReflowAI GP',
        label: userEmail,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret,
      });

      const secretBase32 = totp.secret.base32;
      setSecret(secretBase32);

      // Generate QR code URL using Google Charts API (simple, no extra deps)
      const otpauthUrl = totp.toString();
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
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
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    if (!verifiedPassword) {
      toast.error('Please complete re-authentication first');
      setStep('reauth');
      setShowReauth(true);
      return;
    }

    setLoading(true);
    try {
      // Verify the code locally first
      const totp = new OTPAuth.TOTP({
        issuer: 'ReflowAI GP',
        label: userEmail,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      const delta = totp.validate({ token: verificationCode, window: 1 });
      if (delta === null) {
        toast.error('Invalid verification code. Please try again.');
        setLoading(false);
        return;
      }

      // Get target user ID
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (!userData) throw new Error('User not found');
        targetUserId = userData.id;
      }

      // Call the secure edge function to enable MFA
      const { data, error } = await supabase.functions.invoke('manage-mfa-settings', {
        body: {
          action: 'enable',
          userId: targetUserId,
          password: verifiedPassword,
          mfaSecret: secret,
          totpCode: verificationCode,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to enable MFA');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

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

  // Show re-authentication dialog first
  if (showReauth && open) {
    return (
      <ReauthenticationDialog
        open={true}
        onOpenChange={handleReauthClose}
        onSuccess={handleReauthSuccess}
        title="Verify Identity for MFA Setup"
        description="Enter your password to begin setting up Two-Factor Authentication"
      />
    );
  }

  return (
    <Dialog open={open && step !== 'reauth'} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Set Up Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Protect your account with an authenticator app
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'generate' && (
            <>
              <Alert>
                <QrCode className="h-4 w-4" />
                <AlertDescription>
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </AlertDescription>
              </Alert>

              <div className="flex justify-center p-4 bg-white rounded-lg">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="MFA QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Or manually enter this secret key:
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={secret}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copySecret}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => setStep('verify')}
                disabled={!secret}
              >
                Continue to Verification
              </Button>
            </>
          )}

          {step === 'verify' && (
            <>
              <Alert variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Enter the 6-digit code from your authenticator app to confirm setup
                </AlertDescription>
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
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('generate')}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={verifyAndSave}
                  disabled={loading || verificationCode.length !== 6}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enable MFA
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
