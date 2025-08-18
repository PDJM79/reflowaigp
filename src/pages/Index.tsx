import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/auth/AuthForm';
import { UserDashboard } from '@/components/dashboard/UserDashboard';
import { OrganizationSetup } from '@/components/auth/OrganizationSetup';
import { useOrganizationSetup } from '@/hooks/useOrganizationSetup';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { needsSetup, loading: setupLoading } = useOrganizationSetup();

  if (authLoading || setupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (needsSetup) {
    return <OrganizationSetup onComplete={() => window.location.reload()} />;
  }

  return <UserDashboard />;
};

export default Index;
