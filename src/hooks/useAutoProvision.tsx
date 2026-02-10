import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface AutoProvisionParams {
  practice_id: string;
}

export function useAutoProvision() {
  return useMutation({
    mutationFn: async ({ practice_id }: AutoProvisionParams) => {
      const response = await fetch(`/api/practices/${practice_id}/auto-provision`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practice_id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Auto-provision failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success('Practice auto-provisioned successfully', {
        description: `Created ${data.templates_created || 0} templates and ${data.reminders_created || 0} scheduled reminders`,
      });
    },
    onError: (error: Error) => {
      toast.error('Auto-provision failed', {
        description: error.message,
      });
    },
  });
}
