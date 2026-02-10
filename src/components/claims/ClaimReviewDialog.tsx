import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

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
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState(
    DEFAULT_CHECKLIST_ITEMS.map(item => ({
      item,
      checked: false,
      checked_at: null as string | null,
    }))
  );

  const handleToggleItem = (index: number, checked: boolean) => {
    const updated = [...checklist];
    updated[index] = {
      ...updated[index],
      checked,
      checked_at: checked ? new Date().toISOString() : null,
    };
    setChecklist(updated);
  };

  const handleCompleteReview = async () => {
    setSaving(true);
    try {
      toast("This feature will be available in a future update", {
        description: "Claim review completion is coming soon"
      });
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to complete review');
    } finally {
      setSaving(false);
    }
  };

  const allItemsChecked = checklist.every(item => item.checked);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Manual Claim Review Checklist</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-3">
            {checklist.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent">
                <Checkbox
                  id={`item-${index}`}
                  checked={item.checked}
                  onCheckedChange={(checked) => handleToggleItem(index, checked as boolean)}
                  className="mt-1 min-w-[20px] min-h-[20px]"
                />
                <div className="flex-1 min-w-0">
                  <Label htmlFor={`item-${index}`} className="cursor-pointer text-sm sm:text-base">
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
            <Label htmlFor="review-notes" className="text-base">Review Notes</Label>
            <Textarea
              id="review-notes"
              placeholder="Add any notes about this claim review..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="min-h-[100px] text-base resize-y"
            />
          </div>

          {!allItemsChecked && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Please complete all checklist items before finalising the review.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCompleteReview}
            disabled={!allItemsChecked || saving}
            className="w-full sm:w-auto min-h-[44px] order-1 sm:order-2"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Complete Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
