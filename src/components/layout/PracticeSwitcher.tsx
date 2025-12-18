import React, { useEffect, useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useMasterUser } from '@/hooks/useMasterUser';
import { usePracticeSelection } from '@/hooks/usePracticeSelection';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PracticeSwitcher() {
  const { user } = useAuth();
  const { isMasterUser, selectedPracticeId, selectedPracticeName, setSelectedPractice, loading: masterLoading } = useMasterUser();
  const { practices, loading: practicesLoading } = usePracticeSelection();
  const [userPracticeName, setUserPracticeName] = useState<string | null>(null);
  const [loadingUserPractice, setLoadingUserPractice] = useState(true);

  // Fetch user's practice name for non-master users
  useEffect(() => {
    const fetchUserPractice = async () => {
      if (!user || isMasterUser) {
        setLoadingUserPractice(false);
        return;
      }

      try {
        const { data: userData } = await supabase
          .from('users')
          .select('practice_id')
          .eq('auth_user_id', user.id)
          .single();

        if (userData?.practice_id) {
          const { data: practiceData } = await supabase
            .from('practices')
            .select('name')
            .eq('id', userData.practice_id)
            .single();

          setUserPracticeName(practiceData?.name || null);
        }
      } catch (error) {
        console.error('Error fetching user practice:', error);
      } finally {
        setLoadingUserPractice(false);
      }
    };

    fetchUserPractice();
  }, [user, isMasterUser]);

  const isLoading = masterLoading || practicesLoading || loadingUserPractice;

  // Determine current practice name to display
  const currentPracticeName = isMasterUser 
    ? selectedPracticeName 
    : userPracticeName;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="hidden sm:inline">Loading...</span>
      </div>
    );
  }

  // If no practice selected/found, don't show anything
  if (!currentPracticeName) {
    return null;
  }

  // For master users, show dropdown to switch practices
  if (isMasterUser) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 h-auto py-1.5 px-2 sm:px-3 text-foreground hover:bg-accent"
          >
            <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-[200px] text-sm font-medium">
              {currentPracticeName}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          {practices.map((practice) => (
            <DropdownMenuItem
              key={practice.id}
              onClick={() => setSelectedPractice(practice.id, practice.name)}
              className={cn(
                "flex items-center justify-between cursor-pointer",
                selectedPracticeId === practice.id && "bg-accent"
              )}
            >
              <span className="truncate">{practice.name}</span>
              {selectedPracticeId === practice.id && (
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // For regular users, show practice name as informational (non-interactive)
  return (
    <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm">
      <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="truncate max-w-[120px] sm:max-w-[200px] font-medium text-foreground">
        {currentPracticeName}
      </span>
    </div>
  );
}
