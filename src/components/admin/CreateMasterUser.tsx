import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function CreateMasterUser() {
  const [creating, setCreating] = useState(false);

  const createMasterUser = async () => {
    setCreating(true);
    try {
      const practiceResponse = await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: 'Master Admin Practice',
          country: 'England',
        }),
      });

      if (!practiceResponse.ok) throw new Error('Failed to create practice');

      const practice = await practiceResponse.json();

      const userResponse = await fetch(`/api/practices/${practice.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: 'Master Admin',
          email: 'phil@reflowai.co.uk',
          role: 'practice_manager',
          isPracticeManager: true,
        }),
      });

      if (!userResponse.ok) throw new Error('Failed to create master user');

      toast.success('Master user account created successfully!');
    } catch (error) {
      console.error('Error creating master user:', error);
      toast.error('Failed to create master user account');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          Create Master User
        </CardTitle>
        <CardDescription>
          Create the system master admin account (phil@reflowai.co.uk)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground" data-testid="text-master-user-details">
            <p><strong>Email:</strong> phil@reflowai.co.uk</p>
            <p><strong>Access:</strong> All practices, full admin rights</p>
          </div>
          
          <Button 
            onClick={createMasterUser}
            disabled={creating}
            className="w-full"
            data-testid="button-create-master-user"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Master User...
              </>
            ) : (
              <>
                <Crown className="h-4 w-4 mr-2" />
                Create Master User Account
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
