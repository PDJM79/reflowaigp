import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Feedback360DialogProps {
  appraisalId: string;
  employeeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const QUESTIONS = [
  "Is positive and supportive",
  "Is approachable and easy to work with",
  "Follows practice procedures",
  "Communicates effectively with the team",
  "Takes initiative when needed",
  "Manages time well"
];

const RESPONSE_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "rarely", label: "Rarely" },
  { value: "sometimes", label: "Sometimes" },
  { value: "often", label: "Often" },
  { value: "consistently", label: "Consistently" },
  { value: "dont_know", label: "Don't Know" }
];

export function Feedback360Dialog({ appraisalId, employeeName, open, onOpenChange, onSuccess }: Feedback360DialogProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check all questions answered
    if (Object.keys(responses).length < QUESTIONS.length) {
      toast.error('Please answer all questions');
      return;
    }

    setSaving(true);

    try {
      const feedbackEntries = QUESTIONS.map((question, index) => ({
        appraisal_id: appraisalId,
        question,
        response: responses[index.toString()]
      }));

      const { error } = await supabase
        .from('hr_360_feedback')
        .insert(feedbackEntries);

      if (error) throw error;

      toast.success('360° feedback submitted successfully');
      setResponses({});
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving 360 feedback:', error);
      toast.error('Failed to save 360 feedback');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>360° Feedback for {employeeName}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Your responses are anonymous. Please provide honest feedback.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {QUESTIONS.map((question, index) => (
            <div key={index} className="space-y-3">
              <Label className="text-base">{question}</Label>
              <RadioGroup
                value={responses[index.toString()]}
                onValueChange={(value) => setResponses({ ...responses, [index.toString()]: value })}
              >
                <div className="grid grid-cols-3 gap-3">
                  {RESPONSE_OPTIONS.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.value} id={`${index}-${option.value}`} />
                      <Label htmlFor={`${index}-${option.value}`} className="font-normal cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          ))}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
