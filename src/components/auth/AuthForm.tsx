import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, CheckCircle, Shield, BarChart3, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Practice {
  id: string;
  name: string;
  country: string;
}

function usePractices() {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [practicesLoading, setPracticesLoading] = useState(true);

  useEffect(() => {
    fetch('/api/practices')
      .then(r => r.ok ? r.json() : [])
      .then((data: Practice[]) => setPractices(data))
      .catch(() => setPractices([]))
      .finally(() => setPracticesLoading(false));
  }, []);

  return { practices, practicesLoading };
}

function AuthPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex flex-col items-center justify-center p-4"
      style={{ backgroundImage: `url('/images/login-backdrop.jpg')` }}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <img src="/images/reflow-logo.png" alt="ReflowAI" className="h-40 w-auto mb-8" />
        {children}
      </div>
    </div>
  );
}

interface BackButtonProps { onClick: () => void }
function BackButton({ onClick }: BackButtonProps) {
  return <Button variant="ghost" size="sm" onClick={onClick} className="p-2 h-auto hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Button>;
}

interface PracticeSelectProps {
  id: string;
  practices: Practice[];
  practicesLoading: boolean;
  practiceId: string;
  onPracticeChange: (v: string) => void;
}

function PracticeSelect({ id, practices, practicesLoading, practiceId, onPracticeChange }: PracticeSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Practice</Label>
      <select id={id} value={practiceId} onChange={e => onPracticeChange(e.target.value)} required disabled={practicesLoading}
        className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
        <option value="">{practicesLoading ? 'Loading practices…' : 'Select your practice'}</option>
        {practices.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
  );
}

interface ForgotPasswordViewProps { onBack: () => void }
function ForgotPasswordView({ onBack }: ForgotPasswordViewProps) {
  return (
    <AuthPageLayout>
      <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <BackButton onClick={onBack} />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Reset Password</h2>
              <p className="text-sm text-muted-foreground">Contact your practice manager</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Password resets are handled by your practice manager. Please contact them directly or email{' '}
            <a href="mailto:support@reflowai.co.uk" className="text-primary hover:underline font-medium">support@reflowai.co.uk</a>.
          </p>
          <Button type="button" className="w-full h-12 mt-6" variant="outline" onClick={onBack}>Back to Sign In</Button>
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}

interface SignUpViewProps {
  email: string; password: string; name: string; loading: boolean;
  onEmailChange: (v: string) => void; onPasswordChange: (v: string) => void;
  onNameChange: (v: string) => void; onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}
function SignUpView({ email, password, name, loading, onEmailChange, onPasswordChange, onNameChange, onBack, onSubmit }: SignUpViewProps) {
  return (
    <AuthPageLayout>
      <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <BackButton onClick={onBack} />
            <div>
              <h2 className="text-xl font-semibold text-foreground">Create Account</h2>
              <p className="text-sm text-muted-foreground">Get started with FitForAudit</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full Name</Label>
              <Input id="signup-name" type="text" placeholder="Your name" value={name} onChange={e => onNameChange(e.target.value)} required className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email Address</Label>
              <Input id="signup-email" type="email" placeholder="your@email.com" value={email} onChange={e => onEmailChange(e.target.value)} required className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input id="signup-password" type="password" placeholder="Min. 12 characters" value={password} onChange={e => onPasswordChange(e.target.value)} required minLength={12} className="h-12" />
            </div>
            <Button type="submit" className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}

interface AdminSignInViewProps {
  email: string; password: string; practiceId: string; practices: Practice[];
  practicesLoading: boolean; loading: boolean;
  onEmailChange: (v: string) => void; onPasswordChange: (v: string) => void;
  onPracticeChange: (v: string) => void; onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}
function AdminSignInView({ email, password, practiceId, practices, practicesLoading, loading, onEmailChange, onPasswordChange, onPracticeChange, onBack, onSubmit }: AdminSignInViewProps) {
  return (
    <AuthPageLayout>
      <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <BackButton onClick={onBack} />
            <div>
              <h2 className="text-xl font-semibold text-foreground">System Administrator</h2>
              <p className="text-sm text-muted-foreground">Access master admin controls</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <PracticeSelect id="admin-practice" practices={practices} practicesLoading={practicesLoading} practiceId={practiceId} onPracticeChange={onPracticeChange} />
            <div className="space-y-2">
              <Label htmlFor="admin-email">Administrator Email</Label>
              <Input id="admin-email" type="email" placeholder="admin@practice.com" value={email} onChange={e => onEmailChange(e.target.value)} required className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input id="admin-password" type="password" value={password} onChange={e => onPasswordChange(e.target.value)} required className="h-12" />
            </div>
            <Button type="submit" className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Administrator Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthPageLayout>
  );
}

const FEATURES = [
  { icon: Shield,    text: 'CQC & NHS compliance tracking' },
  { icon: BarChart3, text: 'Real-time audit readiness scores' },
  { icon: FileCheck, text: 'Automated evidence management' },
];

interface MainSignInCardProps {
  email: string;
  password: string;
  practiceId: string;
  practices: Practice[];
  practicesLoading: boolean;
  loading: boolean;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onPracticeChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
  onNewPractice: () => void;
  onAdminLogin: () => void;
}

function MainSignInCard({
  email, password, practiceId, practices, practicesLoading, loading,
  onEmailChange, onPasswordChange, onPracticeChange,
  onSubmit, onForgotPassword, onNewPractice, onAdminLogin,
}: MainSignInCardProps) {
  return (
    <div className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex flex-col items-center justify-center p-4"
      style={{ backgroundImage: `url('/images/login-backdrop.jpg')` }}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <img src="/images/reflow-logo.png" alt="ReflowAI" className="h-40 w-auto mb-6" />
        <h1 className="text-4xl font-bold text-white mb-2 text-center">Fit for Audit</h1>
        <p className="text-white/90 text-lg mb-8 text-center">Compliance Management for GP Surgeries</p>
        <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl">
          <CardContent className="p-8">
            <div className="space-y-3 mb-6">
              {FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">{feature.text}</span>
                </div>
              ))}
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <PracticeSelect id="signin-practice" practices={practices} practicesLoading={practicesLoading} practiceId={practiceId} onPracticeChange={onPracticeChange} />
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email Address</Label>
                <Input id="signin-email" type="email" placeholder="your@email.com" value={email} onChange={e => onEmailChange(e.target.value)} required className="h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input id="signin-password" type="password" value={password} onChange={e => onPasswordChange(e.target.value)} required className="h-12" />
              </div>
              <Button type="submit" className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg text-base" disabled={loading || practicesLoading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <div className="flex items-center justify-between text-sm">
                <Button type="button" variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary" onClick={onForgotPassword}>Forgot password?</Button>
                <Button type="button" variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary" onClick={onNewPractice}>New practice? Sign up</Button>
              </div>
            </form>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">or</span></div>
            </div>
            <Button type="button" variant="outline" className="w-full h-10 text-muted-foreground border-muted" onClick={onAdminLogin}>
              <Shield className="mr-2 h-4 w-4" />System Administrator Login
            </Button>
          </CardContent>
        </Card>
        <p className="text-white/80 text-sm mt-8 text-center">
          Need help? Email{' '}
          <a href="mailto:support@reflowai.co.uk" className="font-semibold hover:underline text-white">support@reflowai.co.uk</a>
        </p>
      </div>
    </div>
  );
}

export function AuthForm() {
  const { signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [practiceId, setPracticeId] = useState('');
  const { practices, practicesLoading } = usePractices();
  const [showSignUp, setShowSignUp] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const lockedPracticeId = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('register') === '1' && params.get('pid')) {
      lockedPracticeId.current = params.get('pid');
      setPracticeId(params.get('pid')!);
      setShowSignUp(true);
    }
  }, []);

  useEffect(() => {
    if (!lockedPracticeId.current && practices.length === 1) setPracticeId(practices[0].id);
  }, [practices]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceId) { toast.error('Please select your practice'); return; }
    await signIn(email, password, practiceId);
  };

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceId) { toast.error('Please select your practice'); return; }
    const { error } = await signIn(email, password, practiceId);
    if (!error) window.location.href = '/admin/calendar';
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    await signUp(email, password, name, practiceId);
  };

  if (showForgotPassword) return <ForgotPasswordView onBack={() => setShowForgotPassword(false)} />;
  if (showSignUp) return <SignUpView email={email} password={password} name={name} loading={loading}
    onEmailChange={setEmail} onPasswordChange={setPassword} onNameChange={setName}
    onBack={() => setShowSignUp(false)} onSubmit={handleSignUp} />;
  if (showAdminLogin) return <AdminSignInView email={email} password={password} practiceId={practiceId}
    practices={practices} practicesLoading={practicesLoading} loading={loading}
    onEmailChange={setEmail} onPasswordChange={setPassword} onPracticeChange={setPracticeId}
    onBack={() => setShowAdminLogin(false)} onSubmit={handleAdminSignIn} />;

  return (
    <MainSignInCard
      email={email}
      password={password}
      practiceId={practiceId}
      practices={practices}
      practicesLoading={practicesLoading}
      loading={loading}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onPracticeChange={setPracticeId}
      onSubmit={handleSignIn}
      onForgotPassword={() => setShowForgotPassword(true)}
      onNewPractice={() => navigate('/onboarding')}
      onAdminLogin={() => setShowAdminLogin(true)}
    />
  );
}
