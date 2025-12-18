import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Fridge } from './types';

interface EditFridgeDialogProps {
  fridge: Fridge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditFridgeDialog({ fridge, open, onOpenChange, onSuccess }: EditFridgeDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    min_temp: '',
    max_temp: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (fridge) {
      setFormData({
        name: fridge.name,
        location: fridge.location || '',
        min_temp: fridge.min_temp.toString(),
        max_temp: fridge.max_temp.toString()
      });
    }
  }, [fridge]);

  const handleSubmit = async () => {
    if (!fridge) return;
    
    if (!formData.name.trim()) {
      toast.error('Please enter a fridge name');
      return;
    }

    const minTemp = parseFloat(formData.min_temp);
    const maxTemp = parseFloat(formData.max_temp);

    if (isNaN(minTemp) || isNaN(maxTemp)) {
      toast.error('Please enter valid temperature values');
      return;
    }

    if (minTemp >= maxTemp) {
      toast.error('Minimum temperature must be less than maximum');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('fridges')
        .update({
          name: formData.name.trim(),
          location: formData.location.trim() || null,
          min_temp: minTemp,
          max_temp: maxTemp
        })
        .eq('id', fridge.id);

      if (error) throw error;

      toast.success('Fridge updated successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating fridge:', error);
      toast.error('Failed to update fridge');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Fridge</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit_name" className="text-base">Fridge Name *</Label>
            <Input
              id="edit_name"
              placeholder="e.g., Vaccine Fridge A"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_location" className="text-base">Location</Label>
            <Input
              id="edit_location"
              placeholder="e.g., Treatment Room 1"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="h-11 text-base"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_min_temp" className="text-base">Min Temp (°C)</Label>
              <Input
                id="edit_min_temp"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={formData.min_temp}
                onChange={(e) => setFormData({ ...formData, min_temp: e.target.value })}
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_max_temp" className="text-base">Max Temp (°C)</Label>
              <Input
                id="edit_max_temp"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={formData.max_temp}
                onChange={(e) => setFormData({ ...formData, max_temp: e.target.value })}
                className="h-11 text-base"
              />
            </div>
          </div>
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
