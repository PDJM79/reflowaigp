import { useAuth } from '@/hooks/useAuth';
import { useMasterUser } from '@/hooks/useMasterUser';
import { AuthForm } from '@/components/auth/AuthForm';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { OrganizationSetup } from '@/components/auth/OrganizationSetup';
import { PasswordChangeForm } from '@/components/auth/PasswordChangeForm';
import { PracticeSelector } from '@/components/master/PracticeSelector';
import { GenerateTestData } from '@/components/admin/GenerateTestData';
import { useOrganizationSetup } from '@/hooks/useOrganizationSetup';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isMasterUser, selectedPracticeId, setSelectedPractice, clearSelectedPractice, loading: masterLoading } = useMasterUser();
  const { needsSetup, loading: setupLoading } = useOrganizationSetup();
  
  // Check if user needs to change password
  const needsPasswordChange = user?.user_metadata?.force_password_change === true;

  if (authLoading || setupLoading || masterLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-4">
        <AuthForm />
        <GenerateTestData />
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

  return <UserDashboard />;
};

export default Index;
