import React, { useState, useEffect, useContext, createContext } from '@/lib/react-singleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface MasterUserContextType {
  isMasterUser: boolean;
  selectedPracticeId: string | null;
  selectedPracticeName: string | null;
  setSelectedPractice: (practiceId: string, practiceName: string) => void;
  clearSelectedPractice: () => void;
  loading: boolean;
}

const MasterUserContext = React.createContext<MasterUserContextType | undefined>(undefined);

export function MasterUserProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isMasterUser, setIsMasterUser] = React.useState(false);
  const [selectedPracticeId, setSelectedPracticeId] = React.useState<string | null>(null);
  const [selectedPracticeName, setSelectedPracticeName] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const checkMasterUser = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_master_user')
          .eq('auth_user_id', user.id)
          .single();

        if (data) {
          setIsMasterUser(data.is_master_user || false);
          
          // If master user, check for stored practice selection
          if (data.is_master_user) {
            const storedPracticeId = sessionStorage.getItem('master_selected_practice_id');
            const storedPracticeName = sessionStorage.getItem('master_selected_practice_name');
            
            if (storedPracticeId && storedPracticeName) {
              setSelectedPracticeId(storedPracticeId);
              setSelectedPracticeName(storedPracticeName);
            }
          }
        }
      } catch (error) {
        console.error('Error checking master user status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkMasterUser();
  }, [user]);

  const setSelectedPractice = (practiceId: string, practiceName: string) => {
    setSelectedPracticeId(practiceId);
    setSelectedPracticeName(practiceName);
    sessionStorage.setItem('master_selected_practice_id', practiceId);
    sessionStorage.setItem('master_selected_practice_name', practiceName);
  };

  const clearSelectedPractice = () => {
    setSelectedPracticeId(null);
    setSelectedPracticeName(null);
    sessionStorage.removeItem('master_selected_practice_id');
    sessionStorage.removeItem('master_selected_practice_name');
  };

  return (
    <MasterUserContext.Provider value={{
      isMasterUser,
      selectedPracticeId,
      selectedPracticeName,
      setSelectedPractice,
      clearSelectedPractice,
      loading
    }}>
      {children}
    </MasterUserContext.Provider>
  );
}

export function useMasterUser() {
  const context = React.useContext(MasterUserContext);
  if (context === undefined) {
    throw new Error('useMasterUser must be used within a MasterUserProvider');
  }
  return context;
}