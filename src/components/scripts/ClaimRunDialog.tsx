import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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
    setLoading(true);

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User not found');

      // Calculate totals
      const totalScripts = scripts.length;
      const totalItems = scripts.reduce((sum, s) => sum + parseFloat(s.quantity || 0), 0);

      // Create claim run
      const { data: claimRun, error: claimError } = await supabase
        .from('claim_runs')
        .insert([{
          practice_id: userData.practice_id,
          claim_type: 'month_end_scripts',
          period_start: formData.period_start,
          period_end: formData.period_end,
          total_scripts: totalScripts,
          total_items: Math.round(totalItems),
          submitted_by: userData.id,
          status: 'draft',
        }])
        .select()
        .single();

      if (claimError) throw claimError;

      // Link scripts to claim run
      const scriptIds = scripts.map(s => s.id);
      const { error: updateError } = await supabase
        .from('month_end_scripts')
        .update({ claim_run_id: claimRun.id })
        .in('id', scriptIds);

      if (updateError) throw updateError;

      // Generate PDF automatically
      const { data: pdfResult, error: pdfError } = await supabase.functions.invoke(
        'generate-scripts-claim-pdf',
        {
          body: { claim_run_id: claimRun.id }
        }
      );

      if (pdfError) {
        console.error('PDF generation error:', pdfError);
        toast.warning(`Claim run created with ${totalScripts} scripts, but PDF generation failed`);
      } else {
        toast.success(`Claim run created with ${totalScripts} scripts. PDF generated successfully.`);
        
        // Optionally trigger download
        if (pdfResult?.download_url) {
          window.open(pdfResult.download_url, '_blank');
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating claim run:', error);
      toast.error('Failed to create claim run');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    toast.info('Select scripts and create a claim run to generate PDF');
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
