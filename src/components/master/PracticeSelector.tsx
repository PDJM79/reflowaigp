import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, User, Loader2 } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { toast } from 'sonner';

interface Practice {
  id: string;
  name: string;
  createdAt: string;
}

interface PracticeSelectorProps {
  onPracticeSelected: (practiceId: string, practiceName: string) => void;
  onSignOut: () => void;
}

export function PracticeSelector({ onPracticeSelected, onSignOut }: PracticeSelectorProps) {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedPracticeId, setSelectedPracticeId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    fetchPractices();
  }, []);

  const fetchPractices = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/practices', {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch practices');

      const data = await response.json();
      setPractices(data || []);
    } catch (error) {
      console.error('Error fetching practices:', error);
      toast.error('Failed to load practices');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterPractice = () => {
    if (!selectedPracticeId) {
      toast.error('Please select a practice first');
      return;
    }

    setEntering(true);
    const selectedPractice = practices.find(p => p.id === selectedPracticeId);
    
    if (selectedPractice) {
      sessionStorage.setItem('master_selected_practice_id', selectedPracticeId);
      sessionStorage.setItem('master_selected_practice_name', selectedPractice.name);
      
      onPracticeSelected(selectedPracticeId, selectedPractice.name);
    }
  };

  const createTestPractice = async () => {
    try {
      const response = await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: 'Test Medical Practice' }),
      });

      if (!response.ok) throw new Error('Failed to create practice');

      toast.success('Test practice created');
      fetchPractices();
    } catch (error) {
      console.error('Error creating test practice:', error);
      toast.error('Failed to create test practice');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center p-8" data-testid="loading-practices">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Master Admin - Practice Selection
            </CardTitle>
            <CardDescription>
              Select which GP practice you want to access and manage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <label className="text-sm font-medium">Available Practices</label>
              <Select value={selectedPracticeId} onValueChange={setSelectedPracticeId}>
                <SelectTrigger data-testid="select-practice">
                  <SelectValue placeholder="Choose a practice to manage" />
                </SelectTrigger>
                <SelectContent>
                  {practices.map((practice) => (
                    <SelectItem key={practice.id} value={practice.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{practice.name}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {practices.length === 0 && (
              <div className="text-center py-8" data-testid="text-no-practices">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No practices found</p>
                <Button onClick={createTestPractice} variant="outline" data-testid="button-create-test-practice">
                  Create Test Practice
                </Button>
              </div>
            )}

            <div className="flex gap-4 justify-between">
              <Button variant="outline" onClick={onSignOut} data-testid="button-sign-out">
                Sign Out
              </Button>
              <Button 
                onClick={handleEnterPractice}
                disabled={!selectedPracticeId || entering}
                className="flex items-center gap-2"
                data-testid="button-enter-practice"
              >
                {entering && <Loader2 className="h-4 w-4 animate-spin" />}
                Enter Practice
              </Button>
            </div>

            <div className="text-xs text-muted-foreground border-t pt-4">
              <p className="font-medium mb-2">Master Admin Capabilities:</p>
              <ul className="space-y-1">
                <li>View and manage all practice data</li>
                <li>Change user passwords and revoke access</li>
                <li>View comprehensive reports across all practices</li>
                <li>Full administrative control over selected practice</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
