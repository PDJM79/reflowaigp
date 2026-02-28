import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, ArrowLeft, CheckCircle, Shield, BarChart3, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Practice {
  id: string;
  name: string;
  country: string;
}

export function AuthForm() {
  const { signIn, signUp, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [practiceId, setPracticeId] = useState('');
  const [practices, setPractices] = useState<Practice[]>([]);
  const [practicesLoading, setPracticesLoading] = useState(true);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    fetch('/api/practices')
      .then(r => r.ok ? r.json() : [])
      .then((data: Practice[]) => {
        setPractices(data);
        if (data.length === 1) setPracticeId(data[0].id);
      })
      .catch(() => setPractices([]))
      .finally(() => setPracticesLoading(false));
  }, []);

  const PracticeSelect = ({ id }: { id: string }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>Practice</Label>
      <select
        id={id}
        value={practiceId}
        onChange={e => setPracticeId(e.target.value)}
        required
        disabled={practicesLoading}
        className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">
          {practicesLoading ? 'Loading practices…' : 'Select your practice'}
        </option>
        {practices.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceId) {
      toast.error('Please select your practice');
      return;
    }
    await signIn(email, password, practiceId);
  };

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceId) {
      toast.error('Please select your practice');
      return;
    }
    const { error } = await signIn(email, password, practiceId);
    if (!error) window.location.href = '/admin/calendar';
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!practiceId) {
      toast.error('Please select your practice');
      return;
    }
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    await signUp(email, password, name, practiceId);
  };

  const backdrop = (
    <div className="absolute inset-0 bg-black/50" />
  );

  const logo = (
    <img src="/images/reflow-logo.png" alt="ReflowAI" className="h-40 w-auto mb-8" />
  );

  const pageWrapper = (children: React.ReactNode) => (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex flex-col items-center justify-center p-4"
      style={{ backgroundImage: `url('/images/login-backdrop.jpg')` }}
    >
      {backdrop}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {logo}
        {children}
      </div>
    </div>
  );

  const backButton = (onClick: () => void) => (
    <Button variant="ghost" size="sm" onClick={onClick} className="p-2 h-auto hover:bg-muted">
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );

  // ── Forgot password ──────────────────────────────────────────────────────────
  if (showForgotPassword) {
    return pageWrapper(
      <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            {backButton(() => setShowForgotPassword(false))}
            <div>
              <h2 className="text-xl font-semibold text-foreground">Reset Password</h2>
              <p className="text-sm text-muted-foreground">Contact your practice manager</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Password resets are handled by your practice manager. Please contact them directly or email{' '}
            <a href="mailto:support@reflowai.co.uk" className="text-primary hover:underline font-medium">
              support@reflowai.co.uk
            </a>
            .
          </p>
          <Button
            type="button"
            className="w-full h-12 mt-6"
            variant="outline"
            onClick={() => setShowForgotPassword(false)}
          >
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Sign up ──────────────────────────────────────────────────────────────────
  if (showSignUp) {
    return pageWrapper(
      <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            {backButton(() => setShowSignUp(false))}
            <div>
              <h2 className="text-xl font-semibold text-foreground">Create Account</h2>
              <p className="text-sm text-muted-foreground">Get started with FitForAudit</p>
            </div>
          </div>
          <form onSubmit={handleSignUp} className="space-y-4">
            <PracticeSelect id="signup-practice" />
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full Name</Label>
              <Input
                id="signup-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email Address</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="Min. 12 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={12}
                className="h-12"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // ── Admin login ──────────────────────────────────────────────────────────────
  if (showAdminLogin) {
    return pageWrapper(
      <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            {backButton(() => setShowAdminLogin(false))}
            <div>
              <h2 className="text-xl font-semibold text-foreground">System Administrator</h2>
              <p className="text-sm text-muted-foreground">Access master admin controls</p>
            </div>
          </div>
          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <PracticeSelect id="admin-practice" />
            <div className="space-y-2">
              <Label htmlFor="admin-email">Administrator Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@practice.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Administrator Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // ── Main sign in ─────────────────────────────────────────────────────────────
  const features = [
    { icon: Shield,    text: 'CQC & NHS compliance tracking' },
    { icon: BarChart3, text: 'Real-time audit readiness scores' },
    { icon: FileCheck, text: 'Automated evidence management' },
  ];

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex flex-col items-center justify-center p-4"
      style={{ backgroundImage: `url('/images/login-backdrop.jpg')` }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        <img src="/images/reflow-logo.png" alt="ReflowAI" className="h-40 w-auto mb-6" />
        <h1 className="text-4xl font-bold text-white mb-2 text-center">Fit for Audit</h1>
        <p className="text-white/90 text-lg mb-8 text-center">Compliance Management for GP Surgeries</p>

        <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl">
          <CardContent className="p-8">
            <div className="space-y-3 mb-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">{feature.text}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSignIn} className="space-y-4">
              <PracticeSelect id="signin-practice" />
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email Address</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg text-base"
                disabled={loading || practicesLoading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>

              <div className="flex items-center justify-between text-sm">
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-muted-foreground hover:text-primary"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto text-muted-foreground hover:text-primary"
                  onClick={() => setShowSignUp(true)}
                >
                  Create account
                </Button>
              </div>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-10 text-muted-foreground border-muted"
              onClick={() => setShowAdminLogin(true)}
            >
              <Shield className="mr-2 h-4 w-4" />
              System Administrator Login
            </Button>
          </CardContent>
        </Card>

        <p className="text-white/80 text-sm mt-8 text-center">
          Need help? Email{' '}
          <a href="mailto:support@reflowai.co.uk" className="font-semibold hover:underline text-white">
            support@reflowai.co.uk
          </a>
        </p>
      </div>
    </div>
  );
}
