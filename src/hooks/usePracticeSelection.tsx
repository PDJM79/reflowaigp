import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Practice {
  id: string;
  name: string;
  created_at?: string;
}

const SELECTED_PRACTICE_KEY = "selected_practice_id";
const SELECTED_PRACTICE_NAME_KEY = "selected_practice_name";

/**
 * Hook for practice selection - only fetches practices for authenticated users.
 * For anonymous users, returns empty array (no public access to practices table).
 */
export const usePracticeSelection = () => {
  const { user } = useAuth();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedPracticeId, setSelectedPracticeId] = useState<string | null>(
    sessionStorage.getItem(SELECTED_PRACTICE_KEY),
  );
  const [selectedPracticeName, setSelectedPracticeName] = useState<string | null>(
    sessionStorage.getItem(SELECTED_PRACTICE_NAME_KEY),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch practices if user is authenticated
    if (!user) {
      setPractices([]);
      setLoading(false);
      return;
    }
    
    fetchPractices();
  }, [user]);

  const fetchPractices = async () => {
    try {
      const { data, error } = await supabase
        .from("practices")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Error fetching practices:", error);
        throw error;
      }

      console.log("Fetched practices:", data);
      setPractices(data || []);
    } catch (error) {
      console.error("Error fetching practices:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectPractice = (practiceId: string, practiceName: string) => {
    sessionStorage.setItem(SELECTED_PRACTICE_KEY, practiceId);
    sessionStorage.setItem(SELECTED_PRACTICE_NAME_KEY, practiceName);
    setSelectedPracticeId(practiceId);
    setSelectedPracticeName(practiceName);
  };

  const clearPracticeSelection = () => {
    sessionStorage.removeItem(SELECTED_PRACTICE_KEY);
    sessionStorage.removeItem(SELECTED_PRACTICE_NAME_KEY);
    setSelectedPracticeId(null);
    setSelectedPracticeName(null);
  };

  return {
    practices,
    selectedPracticeId,
    selectedPracticeName,
    loading,
    selectPractice,
    clearPracticeSelection,
  };
};
