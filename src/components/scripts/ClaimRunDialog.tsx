import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Download, FileText } from 'lucide-react';

interface ClaimRunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedMonth: string;
  scripts: any[];
}

export function ClaimRunDialog({ isOpen, onClose, onSuccess, selectedMonth, scripts }: ClaimRunDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    period_start: selectedMonth + '-01',
    period_end: new Date(selectedMonth + '-01').toISOString().slice(0, 7) + '-' + 
      new Date(new Date(selectedMonth + '-01').getFullYear(), new Date(selectedMonth + '-01').getMonth() + 1, 0).getDate().toString().padStart(2, '0'),
  });

  const handleCreateClaim = async () => {
    toast.info('Claim run creation will be available soon. This feature is being migrated.');
    onClose();
  };

  const handleExportPDF = async () => {
    toast.info('PDF export will be available soon. This feature is being migrated.');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Claim Run
          </DialogTitle>
          <DialogDescription>
            Group scripts for claim submission
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Scripts Selected:</span>
              <span className="font-semibold">{scripts.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Items:</span>
              <span className="font-semibold">
                {scripts.reduce((sum, s) => sum + parseFloat(s.quantity || 0), 0).toFixed(0)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period_start">Period Start</Label>
              <Input
                id="period_start"
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period_end">Period End</Label>
              <Input
                id="period_end"
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              This will create a claim run for the selected scripts. You can export to PDF for submission.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleExportPDF}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={handleCreateClaim} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Creating...' : 'Create Claim Run'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
