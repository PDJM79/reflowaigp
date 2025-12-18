import { useContext, createContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  practiceId: string;
  isPracticeManager: boolean;
  practice: {
    id: string;
    name: string;
    country: string;
  } | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchAuthUser(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/user', {
    credentials: 'include',
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    throw new Error(`${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchAuthUser,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{
      user: user || null,
      loading: isLoading,
      isAuthenticated: !!user && !error,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}
