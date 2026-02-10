import { useState, useEffect } from "react";

interface Practice {
  id: string;
  name: string;
}

const SELECTED_PRACTICE_KEY = "selected_practice_id";
const SELECTED_PRACTICE_NAME_KEY = "selected_practice_name";

export const usePracticeSelection = () => {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedPracticeId, setSelectedPracticeId] = useState<string | null>(
    sessionStorage.getItem(SELECTED_PRACTICE_KEY),
  );
  const [selectedPracticeName, setSelectedPracticeName] = useState<string | null>(
    sessionStorage.getItem(SELECTED_PRACTICE_NAME_KEY),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPractices();
  }, []);

  const fetchPractices = async () => {
    try {
      const response = await fetch('/api/practices', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch practices');
      }
      const data = await response.json();
      console.log("Fetched practices:", data);
      setPractices(data || []);
      
      // Validate that cached practice still exists
      const cachedId = sessionStorage.getItem(SELECTED_PRACTICE_KEY);
      if (cachedId && data) {
        const practiceExists = data.some((p: Practice) => p.id === cachedId);
        if (!practiceExists) {
          // Clear stale cache
          sessionStorage.removeItem(SELECTED_PRACTICE_KEY);
          sessionStorage.removeItem(SELECTED_PRACTICE_NAME_KEY);
          setSelectedPracticeId(null);
          setSelectedPracticeName(null);
        }
      }
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
