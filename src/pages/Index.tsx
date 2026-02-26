import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMasterUser } from '@/hooks/useMasterUser';
import { AuthForm } from '@/components/auth/AuthForm';
import { OrganizationSetup } from '@/components/auth/OrganizationSetup';
import { PasswordChangeForm } from '@/components/auth/PasswordChangeForm';
import { PracticeSelector } from '@/components/master/PracticeSelector';
import { useOrganizationSetup } from '@/hooks/useOrganizationSetup';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isMasterUser, selectedPracticeId, setSelectedPractice, clearSelectedPractice, loading: masterLoading } = useMasterUser();
  const { needsSetup, loading: setupLoading } = useOrganizationSetup();
  
  // Not applicable with custom session auth
  const needsPasswordChange = false;

  if (authLoading || setupLoading || masterLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Not logged in - show auth form directly
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <AuthForm />
      </div>
    );
  }

  if (needsPasswordChange) {
    return <PasswordChangeForm onComplete={() => window.location.reload()} />;
  }

  // Master user flow - show practice selector if no practice selected
  if (isMasterUser && !selectedPracticeId) {
    return (
      <PracticeSelector 
        onPracticeSelected={setSelectedPractice}
        onSignOut={() => {
          clearSelectedPractice();
          signOut();
        }}
      />
    );
  }

  if (needsSetup) {
    return <OrganizationSetup onComplete={() => window.location.reload()} />;
  }

  // User is authenticated and setup is complete - redirect to home with sidebar
  return <Navigate to="/" replace />;
};

export default Index;
