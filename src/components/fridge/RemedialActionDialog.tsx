import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { TempLogWithFridge } from './types';

interface RemedialActionDialogProps {
  log: TempLogWithFridge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const OUTCOME_OPTIONS = [
  { value: 'stock_ok', label: 'Stock verified OK - no action needed' },
  { value: 'stock_moved', label: 'Stock moved to alternative storage' },
  { value: 'stock_discarded', label: 'Stock discarded as precaution' },
  { value: 'fridge_serviced', label: 'Fridge serviced/recalibrated' },
  { value: 'monitoring', label: 'Under monitoring - further checks scheduled' },
  { value: 'other', label: 'Other (specify in notes)' }
];

export function RemedialActionDialog({ log, open, onOpenChange, onSuccess }: RemedialActionDialogProps) {
  const [remedialAction, setRemedialAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (log) {
      setRemedialAction(log.remedial_action || '');
      setOutcome(log.outcome || '');
    }
  }, [log]);

  const handleSubmit = async () => {
    if (!log) return;
    
    if (!remedialAction.trim()) {
      toast.error('Please describe the remedial action taken');
      return;
    }

    if (!outcome) {
      toast.error('Please select an outcome');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('temp_logs')
        .update({
          remedial_action: remedialAction.trim(),
          outcome: outcome
        })
        .eq('id', log.id);

      if (error) throw error;

      toast.success('Remedial action recorded successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving remedial action:', error);
      toast.error('Failed to save remedial action');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Record Remedial Action
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          {/* Breach Details */}
          <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{log.fridges?.name}</span>
              <Badge variant="destructive">BREACH</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Temperature: <span className="font-semibold text-foreground">{log.reading}°C</span></p>
              <p>Acceptable Range: {log.fridges?.min_temp}°C - {log.fridges?.max_temp}°C</p>
              <p>Recorded: {log.log_date} ({log.log_time})</p>
            </div>
          </div>

          {/* Remedial Action */}
          <div className="space-y-2">
            <Label htmlFor="remedial_action" className="text-base">Remedial Action Taken *</Label>
            <Textarea
              id="remedial_action"
              placeholder="Describe the corrective actions taken..."
              value={remedialAction}
              onChange={(e) => setRemedialAction(e.target.value)}
              className="min-h-[100px] text-base"
            />
          </div>

          {/* Outcome */}
          <div className="space-y-2">
            <Label htmlFor="outcome" className="text-base">Outcome *</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto min-h-[44px]"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="w-full sm:w-auto min-h-[44px]"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Action'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
