import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScriptClaimRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ScriptClaimRunDialog({ open, onOpenChange, onSuccess }: ScriptClaimRunDialogProps) {
  const now = new Date();
  const [periodStart, setPeriodStart] = useState<Date>(startOfMonth(now));
  const [periodEnd, setPeriodEnd] = useState<Date>(endOfMonth(now));
  const [creating, setCreating] = useState(false);

  const handleCreateRun = async () => {
    setCreating(true);
    try {
      toast("This feature will be available in a future update", {
        description: "Script claim run creation is coming soon"
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating claim run:', error);
      toast.error('Failed to create claim run');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Claim Run</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Period Start (defaults to 1st of current month)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(periodStart, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={periodStart}
                  onSelect={(date) => date && setPeriodStart(date)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Period End (defaults to end of month)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(periodEnd, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={periodEnd}
                  onSelect={(date) => date && setPeriodEnd(date)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <p className="text-sm text-muted-foreground">
            This will auto-populate scripts from month_end_scripts that fall within this period.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRun} disabled={creating}>
              {creating ? 'Creating...' : 'Create Run'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
