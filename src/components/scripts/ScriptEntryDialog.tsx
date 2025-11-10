import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Pill } from 'lucide-react';
import CryptoJS from 'crypto-js';

interface ScriptEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ScriptEntryDialog({ isOpen, onClose, onSuccess }: ScriptEntryDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7),
    issue_date: '',
    drug_code: '',
    drug_name: '',
    prescriber: '',
    quantity: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User not found');

      // Generate EMIS hash to prevent duplicates
      const emisHash = CryptoJS.SHA256(
        `${userData.practice_id}_${formData.month}_${formData.issue_date}_${formData.drug_code}_${formData.prescriber}_${formData.quantity}`
      ).toString();

      // Insert script record
      const { error } = await supabase
        .from('month_end_scripts')
        .insert([{
          practice_id: userData.practice_id,
          month: formData.month + '-01',
          issue_date: formData.issue_date,
          drug_code: formData.drug_code,
          drug_name: formData.drug_name,
          prescriber: formData.prescriber,
          quantity: parseFloat(formData.quantity),
          notes: formData.notes || null,
          created_by: userData.id,
          emis_hash: emisHash,
        }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('This script has already been recorded');
        }
        throw error;
      }

      toast.success('Script recorded successfully');
      onSuccess();
      onClose();
      setFormData({
        month: new Date().toISOString().slice(0, 7),
        issue_date: '',
        drug_code: '',
        drug_name: '',
        prescriber: '',
        quantity: '',
        notes: '',
      });
    } catch (error: any) {
      console.error('Error recording script:', error);
      toast.error(error.message || 'Failed to record script');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Record Script
          </DialogTitle>
          <DialogDescription>
            Add a new controlled drug script record
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month *</Label>
              <Input
                id="month"
                type="month"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue_date">Issue Date *</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drug_code">Drug Code *</Label>
              <Input
                id="drug_code"
                value={formData.drug_code}
                onChange={(e) => setFormData({ ...formData, drug_code: e.target.value })}
                placeholder="e.g., BNF12345"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drug_name">Drug Name *</Label>
              <Input
                id="drug_name"
                value={formData.drug_name}
                onChange={(e) => setFormData({ ...formData, drug_name: e.target.value })}
                placeholder="e.g., Morphine Sulphate"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prescriber">Prescriber *</Label>
              <Input
                id="prescriber"
                value={formData.prescriber}
                onChange={(e) => setFormData({ ...formData, prescriber: e.target.value })}
                placeholder="Dr. Smith"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="28"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes (optional)"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : 'Record Script'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
