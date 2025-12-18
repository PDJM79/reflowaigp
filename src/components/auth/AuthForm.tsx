import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, Building2 } from 'lucide-react';
import { usePracticeSelection } from '@/hooks/usePracticeSelection';

export function AuthForm() {
  const { signIn } = useAuth();
  const { selectedPracticeName, clearPracticeSelection } = usePracticeSelection();

  const handleSignIn = () => {
    signIn();
  };

  return (
    <div className="min-h-screen bg-background">
      {selectedPracticeName && (
        <Button
          variant="ghost"
          onClick={clearPracticeSelection}
          className="fixed top-4 left-4 z-50"
          data-testid="button-back-to-practice-selection"
        >
          Back to practice selection
        </Button>
      )}
      <AppHeader />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {selectedPracticeName && (
              <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-center justify-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-semibold text-primary">{selectedPracticeName}</span>
              </div>
            )}
            <CardTitle className="text-2xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              GP Surgery Audit & Compliance
            </CardTitle>
            <CardDescription>
              {selectedPracticeName 
                ? `Sign in to access ${selectedPracticeName}`
                : 'Comprehensive compliance and audit management for GP surgeries'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleSignIn} 
              className="w-full" 
              size="lg"
              data-testid="button-sign-in"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign in with Replit
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Secure authentication powered by Replit
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
