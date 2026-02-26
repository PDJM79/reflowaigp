import { useState, useEffect, useContext, createContext, type ReactNode } from 'react';
import { toast } from '@/components/ui/use-toast';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  practiceId: string;
  isPracticeManager: boolean;
  practice: { id: string; name: string; country: string } | null;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string, practiceId: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string, practiceId: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount via server-side session cookie
  useEffect(() => {
    fetch('/api/auth/user', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function signIn(email: string, password: string, practiceId: string): Promise<{ error: string | null }> {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, practiceId }),
      });

      if (!res.ok) {
        const data = await res.json();
        const message = data.error ?? 'Sign in failed';
        toast({ title: 'Sign in failed', description: message, variant: 'destructive' });
        return { error: message };
      }

      // Fetch full user object (includes practice details)
      const userRes = await fetch('/api/auth/user', { credentials: 'include' });
      const userData = await userRes.json();
      setUser(userData);
      return { error: null };
    } catch {
      const message = 'Network error — please try again';
      toast({ title: 'Sign in failed', description: message, variant: 'destructive' });
      return { error: message };
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email: string, password: string, name: string, practiceId: string): Promise<{ error: string | null }> {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name, practiceId }),
      });

      if (!res.ok) {
        const data = await res.json();
        const message = data.error ?? 'Registration failed';
        toast({ title: 'Registration failed', description: message, variant: 'destructive' });
        return { error: message };
      }

      const userRes = await fetch('/api/auth/user', { credentials: 'include' });
      const userData = await userRes.json();
      setUser(userData);
      toast({ title: 'Account created', description: 'Welcome to FitForAudit!' });
      return { error: null };
    } catch {
      const message = 'Network error — please try again';
      toast({ title: 'Registration failed', description: message, variant: 'destructive' });
      return { error: message };
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    setUser(null);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.warn('Sign out error (continuing):', err);
    }
    toast({ title: 'Signed out', description: 'You have been signed out successfully' });
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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
