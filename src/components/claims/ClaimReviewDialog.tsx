import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ClaimReviewDialogProps {
  claimRunId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_CHECKLIST_ITEMS = [
  "Patient notes reviewed for all claims",
  "Blood test results verified where applicable",
  "Consultation dates confirmed",
  "Treatment codes validated",
  "Duplicate claims checked",
  "Enhanced service eligibility confirmed",
  "QOF indicators cross-referenced",
  "Documentation complete for audit trail",
];

export function ClaimReviewDialog({ claimRunId, open, onOpenChange }: ClaimReviewDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");

  // Fetch or initialize checklist
  const { data: checklist, isLoading } = useQuery({
    queryKey: ['claim-review-checklist', claimRunId],
    queryFn: async () => {
      const { data: existingChecklist } = await supabase
        .from('claim_review_checklist' as any)
        .select('*')
        .eq('claim_run_id', claimRunId)
        .single();

      if (existingChecklist) {
        return existingChecklist as any;
      }

      // Initialize with default items
      return {
        checklist_items: DEFAULT_CHECKLIST_ITEMS.map(item => ({
          item,
          checked: false,
          checked_by: null,
          checked_at: null,
        })),
      } as any;
    },
    enabled: open,
  });

  // Update checklist mutation
  const updateChecklistMutation = useMutation({
    mutationFn: async ({ itemIndex, checked }: { itemIndex: number; checked: boolean }) => {
      const { data: userData } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User not found');

      const updatedItems = [...(checklist?.checklist_items || [])];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        checked,
        checked_by: checked ? userData.id : null,
        checked_at: checked ? new Date().toISOString() : null,
      };

      if (checklist?.id) {
        // Update existing
        const { error } = await supabase
          .from('claim_review_checklist' as any)
          .update({ checklist_items: updatedItems } as any)
          .eq('id', checklist.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('claim_review_checklist' as any)
          .insert({
            claim_run_id: claimRunId,
            practice_id: userData.practice_id,
            checklist_items: updatedItems,
          } as any);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claim-review-checklist', claimRunId] });
    },
  });

  // Complete review mutation
  const completeReviewMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User not found');

      // Update claim_run
      const { error: claimError } = await supabase
        .from('claim_runs')
        .update({
          manual_review_completed: true,
          manual_review_completed_by: userData.id,
          manual_review_completed_at: new Date().toISOString(),
          manual_review_notes: notes,
        } as any)
        .eq('id', claimRunId);

      if (claimError) throw claimError;

      // Update checklist
      if (checklist?.id) {
        const { error: checklistError } = await supabase
          .from('claim_review_checklist' as any)
          .update({
            reviewed_by: userData.id,
            reviewed_at: new Date().toISOString(),
            notes,
          } as any)
          .eq('id', checklist.id);

        if (checklistError) throw checklistError;
      }
    },
    onSuccess: () => {
      toast.success('Claim review completed');
      queryClient.invalidateQueries({ queryKey: ['claim-runs'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to complete review', { description: error.message });
    },
  });

  const allItemsChecked = checklist?.checklist_items?.every((item: any) => item.checked) || false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual Claim Review Checklist</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {checklist?.checklist_items?.map((item: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox
                    id={`item-${index}`}
                    checked={item.checked}
                    onCheckedChange={(checked) => 
                      updateChecklistMutation.mutate({ itemIndex: index, checked: checked as boolean })
                    }
                  />
                  <div className="flex-1">
                    <Label htmlFor={`item-${index}`} className="cursor-pointer">
                      {item.item}
                    </Label>
                    {item.checked && item.checked_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <CheckCircle2 className="h-3 w-3 inline mr-1" />
                        Checked {new Date(item.checked_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="review-notes">Review Notes</Label>
              <Textarea
                id="review-notes"
                placeholder="Add any notes about this claim review..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            {!allItemsChecked && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Please complete all checklist items before finalizing the review.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => completeReviewMutation.mutate()}
            disabled={!allItemsChecked || completeReviewMutation.isPending}
          >
            {completeReviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Complete Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
