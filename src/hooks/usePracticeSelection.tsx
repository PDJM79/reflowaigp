import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Practice {
  id: string;
  name: string;
  created_at?: string;
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
      const { data, error } = await supabase
        .from("practices")
        .select("id, name") // Only fetch non-sensitive fields
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
