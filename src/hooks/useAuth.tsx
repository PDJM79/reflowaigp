// Auth context - clean rewrite 2025-06-18
import { useState, useEffect, useContext, createContext, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

// Auth cleanup utility to prevent limbo states
function cleanupAuthState(): void {
  // Clear the specific Supabase auth token for this project
  const supabaseKey = 'sb-eeqfqklcdstbziedsnxc-auth-token';
  localStorage.removeItem(supabaseKey);
  
  // Clear all Supabase-related keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase') || key.includes('sb-') || key.includes('auth')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear session storage completely
  sessionStorage.clear();
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: unknown }>;
  signIn: (email: string, password: string, isAdmin?: boolean) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string) {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl }
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link",
        });
      }
      return { error };
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string, isAdmin?: boolean) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (isAdmin) {
        window.location.href = '/admin/calendar';
      }
      return { error };
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    // Immediately clear state to prevent auto-login loop
    setUser(null);
    setSession(null);
    setLoading(true);
    
    // Clear all auth storage
    cleanupAuthState();
    
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.warn('Sign out error (continuing):', err);
    }
    
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    
    // Redirect to login page (not root which may auto-redirect back)
    window.location.href = '/login';
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
