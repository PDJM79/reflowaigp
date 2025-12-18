import { useContext, createContext } from 'react';
import { useQuery } from '@tanstack/react-query';

interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  practiceUsers: Array<{
    id: string;
    practiceId: string;
    name: string;
    email: string;
    role: string;
    isPracticeManager: boolean;
    practice: {
      id: string;
      name: string;
      country: string;
    };
  }>;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
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
  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchAuthUser,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const signIn = () => {
    window.location.href = '/api/login';
  };

  const signOut = () => {
    window.location.href = '/api/logout';
  };

  return (
    <AuthContext.Provider value={{
      user: user || null,
      loading: isLoading,
      isAuthenticated: !!user && !error,
      signIn,
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
