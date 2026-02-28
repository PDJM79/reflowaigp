import { useCallback } from 'react';

interface ProcessDiagram {
  mermaid_text: string;
  generated_at: string;
  source_hash: string;
  is_ai_enhanced: boolean;
  cached: boolean;
}

interface UseProcessDiagramReturn {
  diagram: ProcessDiagram | null;
  loading: boolean;
  error: string | null;
  generateDiagram: (processTemplateId: string, regenerate?: boolean) => Promise<void>;
  clearDiagram: () => void;
}

export function useProcessDiagram(): UseProcessDiagramReturn {
  const generateDiagram = useCallback(async (_processTemplateId: string, _regenerate = false) => {
    // AI diagram generation via Edge Function is not available
  }, []);

  const clearDiagram = useCallback(() => {}, []);

  return {
    diagram: null,
    loading: false,
    error: null,
    generateDiagram,
    clearDiagram,
  };
}
