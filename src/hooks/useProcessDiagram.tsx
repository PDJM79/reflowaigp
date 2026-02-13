import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [diagram, setDiagram] = useState<ProcessDiagram | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateDiagram = useCallback(async (processTemplateId: string, regenerate = false) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('generate-process-diagram', {
        body: { process_template_id: processTemplateId, regenerate }
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to generate diagram');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setDiagram(data);
      
      if (regenerate) {
        toast.success('Diagram regenerated successfully');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate diagram';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearDiagram = useCallback(() => {
    setDiagram(null);
    setError(null);
  }, []);

  return {
    diagram,
    loading,
    error,
    generateDiagram,
    clearDiagram,
  };
}
