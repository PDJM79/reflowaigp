import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, ArrowLeft, CheckCircle, Shield, BarChart3, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

export function AuthForm() {
  const { signIn, signUp, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password, true);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    await signUp(email, password);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setResetLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      console.log('Sending reset email with redirect:', redirectUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox and click the link.');
      setShowForgotPassword(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  const features = [
    { icon: Shield, text: 'CQC & NHS compliance tracking' },
    { icon: BarChart3, text: 'Real-time audit readiness scores' },
    { icon: FileCheck, text: 'Automated evidence management' },
  ];

  // Forgot password view
  if (showForgotPassword) {
    return (
      <div 
        className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex flex-col items-center justify-center p-4"
        style={{ backgroundImage: `url('/images/login-backdrop.png')` }}
      >
        <div className="absolute inset-0 bg-black/50" />
        
        <div className="relative z-10 flex flex-col items-center w-full max-w-md">
          <img 
            src="/images/reflow-logo.png" 
            alt="ReflowAI" 
            className="h-40 w-auto mb-8"
          />
          
          <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForgotPassword(false)}
                  className="p-2 h-auto hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Reset Password</h2>
                  <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
                </div>
              </div>
              
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg" 
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Reset Email
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Sign up view
  if (showSignUp) {
    return (
      <div 
        className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex flex-col items-center justify-center p-4"
        style={{ backgroundImage: `url('/images/login-backdrop.png')` }}
      >
        <div className="absolute inset-0 bg-black/50" />
        
        <div className="relative z-10 flex flex-col items-center w-full max-w-md">
          <img 
            src="/images/reflow-logo.png" 
            alt="ReflowAI" 
            className="h-40 w-auto mb-8"
          />
          
          <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSignUp(false)}
                  className="p-2 h-auto hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Create Account</h2>
                  <p className="text-sm text-muted-foreground">Get started with ReflowAI</p>
                </div>
              </div>
              
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email Address</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
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
        </div>
      </div>
    );
  }

  // Admin login view
  if (showAdminLogin) {
    return (
      <div 
        className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex flex-col items-center justify-center p-4"
        style={{ backgroundImage: `url('/images/login-backdrop.png')` }}
      >
        <div className="absolute inset-0 bg-black/50" />
        
        <div className="relative z-10 flex flex-col items-center w-full max-w-md">
          <img 
            src="/images/reflow-logo.png" 
            alt="ReflowAI" 
            className="h-40 w-auto mb-8"
          />
          
          <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdminLogin(false)}
                  className="p-2 h-auto hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">System Administrator</h2>
                  <p className="text-sm text-muted-foreground">Access master admin controls</p>
                </div>
              </div>
              
              <form onSubmit={handleAdminSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Administrator Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@practice.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    onChange={(e) => setPassword(e.target.value)}
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
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm text-muted-foreground"
                  onClick={() => {
                    setShowAdminLogin(false);
                    setShowForgotPassword(true);
                  }}
                >
                  Forgot your password?
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main sign in view
  return (
    <div 
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat relative flex flex-col items-center justify-center p-4"
      style={{ backgroundImage: `url('/images/login-backdrop.png')` }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {/* Logo */}
        <img 
            src="/images/reflow-logo.png" 
            alt="ReflowAI" 
            className="h-40 w-auto mb-6"
        />
        
        {/* Headline */}
        <h1 className="text-4xl font-bold text-white mb-2 text-center">
          Fit for Audit
        </h1>
        <p className="text-white/90 text-lg mb-8 text-center">
          Compliance Management for GP Surgeries
        </p>
        
        {/* Login Card */}
        <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-2xl">
          <CardContent className="p-8">
            {/* Features */}
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
            
            {/* Sign In Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email Address</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg text-base" 
                disabled={loading}
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
            
            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">or</span>
              </div>
            </div>
            
            {/* Admin Login Link */}
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
        
        {/* Footer */}
        <p className="text-white/80 text-sm mt-8 text-center">
          Need help? Email{' '}
          <a 
            href="mailto:support@reflowai.co.uk" 
            className="font-semibold hover:underline text-white"
          >
            support@reflowai.co.uk
          </a>
        </p>
      </div>
    </div>
  );
}
