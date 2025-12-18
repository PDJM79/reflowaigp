import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMasterUser } from '@/hooks/useMasterUser';
import { AuthForm } from '@/components/auth/AuthForm';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { OrganizationSetup } from '@/components/auth/OrganizationSetup';
import { PracticeSelector } from '@/components/master/PracticeSelector';
import { PracticeSelection } from '@/components/auth/PracticeSelection';
import { GenerateTestData } from '@/components/admin/GenerateTestData';
import { useOrganizationSetup } from '@/hooks/useOrganizationSetup';
import { usePracticeSelection } from '@/hooks/usePracticeSelection';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading, signOut, isAuthenticated } = useAuth();
  const { isMasterUser, selectedPracticeId, setSelectedPractice, clearSelectedPractice, loading: masterLoading } = useMasterUser();
  const { needsSetup, loading: setupLoading } = useOrganizationSetup();
  const { selectedPracticeId: preAuthPracticeId, loading: practiceLoading, selectPractice } = usePracticeSelection();
  const [showAuthForm, setShowAuthForm] = useState(false);

  if (authLoading || setupLoading || masterLoading || practiceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Show practice selection first, then auth form
    if (!showAuthForm) {
      return <PracticeSelection onPracticeSelected={() => setShowAuthForm(true)} />;
    }
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-4">
        <AuthForm />
        <GenerateTestData />
      </div>
    );
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

  return <UserDashboard />;
};

export default Index;
