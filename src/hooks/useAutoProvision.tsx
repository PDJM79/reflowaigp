import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AutoProvisionParams {
  practice_id: string;
}

export function useAutoProvision() {
  return useMutation({
    mutationFn: async ({ practice_id }: AutoProvisionParams) => {
      const { data, error } = await supabase.functions.invoke('auto-provision-practice', {
        body: { practice_id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success('Practice auto-provisioned successfully', {
        description: `Created ${data.templates_created} templates and ${data.reminders_created} scheduled reminders`,
      });
    },
    onError: (error: Error) => {
      toast.error('Auto-provision failed', {
        description: error.message,
      });
    },
  });
}
