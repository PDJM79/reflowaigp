import { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePracticeSelection } from '@/hooks/usePracticeSelection';
import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/layout/AppHeader';

interface PracticeSelectionProps {
  onPracticeSelected: () => void;
}

export const PracticeSelection = ({ onPracticeSelected }: PracticeSelectionProps) => {
  const { practices, loading, selectPractice } = usePracticeSelection();
  const [selectedId, setSelectedId] = useState<string>('');

  const handleContinue = () => {
    const practice = practices.find(p => p.id === selectedId);
    if (practice) {
      selectPractice(practice.id, practice.name);
      onPracticeSelected();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <AppHeader />
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <AppHeader />
      
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Choose Your Practice</CardTitle>
          <CardDescription className="text-base">
            Select your practice from the list below to continue
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Practice</label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a practice" />
              </SelectTrigger>
              <SelectContent>
                {practices.map((practice) => (
                  <SelectItem key={practice.id} value={practice.id}>
                    {practice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleContinue} 
            disabled={!selectedId}
            className="w-full h-12 text-base font-semibold"
          >
            Continue to Login
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-12"
            onClick={() => {
              // TODO: Navigate to practice registration
              console.log('Add new practice');
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Practice
          </Button>

          {practices.length === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              No practices found. Please contact your administrator.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
