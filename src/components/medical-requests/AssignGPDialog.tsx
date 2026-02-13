import { useState, useEffect } from 'react';
import { UserCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { MedicalRequest, GPEmployee } from './types';

interface AssignGPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practiceId: string;
  request: MedicalRequest | null;
  onSuccess: () => void;
}

export function AssignGPDialog({
  open,
  onOpenChange,
  practiceId,
  request,
  onSuccess,
}: AssignGPDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [gps, setGps] = useState<GPEmployee[]>([]);
  const [selectedGpId, setSelectedGpId] = useState<string>('');

  useEffect(() => {
    if (open && practiceId) {
      fetchGPs();
      if (request?.assigned_gp_id) {
        setSelectedGpId(request.assigned_gp_id);
      }
    }
  }, [open, practiceId, request]);

  const fetchGPs = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, role')
        .eq('practice_id', practiceId)
        .in('role', ['gp', 'cd_lead_gp'])
        .is('end_date', null)
        .order('name');

      if (error) throw error;
      setGps(data || []);
    } catch (error) {
      console.error('Error fetching GPs:', error);
    }
  };

  const handleAssign = async () => {
    if (!request || !selectedGpId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('medical_requests')
        .update({
          assigned_gp_id: selectedGpId,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({ title: 'GP assigned successfully' });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning GP:', error);
      toast({
        title: 'Error assigning GP',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const currentGP = gps.find((gp) => gp.id === request?.assigned_gp_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Assign to GP
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentGP && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Currently assigned to:</p>
              <p className="font-medium">{currentGP.name}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Select GP</Label>
            <Select value={selectedGpId} onValueChange={setSelectedGpId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a GP..." />
              </SelectTrigger>
              <SelectContent>
                {gps.map((gp) => (
                  <SelectItem key={gp.id} value={gp.id}>
                    {gp.name}
                    {gp.role && (
                      <span className="text-muted-foreground ml-2">
                        ({gp.role.replace(/_/g, ' ')})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {gps.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No GPs found in this practice
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={loading || !selectedGpId}
          >
            {loading ? 'Assigning...' : 'Assign GP'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
