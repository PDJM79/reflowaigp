// PracticeSwitcher - clean rewrite without usePracticeSelection dependency
import { useEffect, useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useMasterUser } from '@/hooks/useMasterUser';
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

interface Practice {
  id: string;
  name: string;
}

export function PracticeSwitcher() {
  const { user } = useAuth();
  const { isMasterUser, selectedPracticeId, selectedPracticeName, setSelectedPractice, loading: masterLoading } = useMasterUser();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [userPracticeName, setUserPracticeName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch practices for master users, or user's practice name for regular users
  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        if (isMasterUser) {
          // Master user: fetch all practices for dropdown
          const { data } = await supabase
            .from('practices')
            .select('id, name')
            .order('name');
          setPractices(data || []);
        } else {
          // Regular user: get practice name from session
          setUserPracticeName(user.practice?.name || null);
        }
      } catch (error) {
        console.error('Error fetching practice data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, isMasterUser]);

  const isLoading = masterLoading || loading;
  const currentPracticeName = isMasterUser ? selectedPracticeName : userPracticeName;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span className="hidden sm:inline">Loading...</span>
      </div>
    );
  }

  if (!currentPracticeName) {
    return null;
  }

  // Master users get a dropdown to switch practices
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

  // Regular users see practice name as informational only
  return (
    <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm">
      <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="truncate max-w-[120px] sm:max-w-[200px] font-medium text-foreground">
        {currentPracticeName}
      </span>
    </div>
  );
}
