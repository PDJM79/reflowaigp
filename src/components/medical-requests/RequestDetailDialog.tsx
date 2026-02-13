import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  FileText,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  Send,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  REQUEST_TYPES,
  calculateTurnaroundDays,
  calculateDaysPending,
  type MedicalRequest,
} from './types';

interface RequestDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MedicalRequest | null;
  onSuccess: () => void;
  onAssignGP: () => void;
}

export function RequestDetailDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
  onAssignGP,
}: RequestDetailDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [gpName, setGpName] = useState<string | null>(null);

  useEffect(() => {
    if (request?.assigned_gp_id) {
      fetchGPName(request.assigned_gp_id);
    } else {
      setGpName(null);
    }
  }, [request?.assigned_gp_id]);

  const fetchGPName = async (gpId: string) => {
    const { data } = await supabase
      .from('employees')
      .select('name')
      .eq('id', gpId)
      .single();
    setGpName(data?.name || null);
  };

  const handleMarkAsSent = async () => {
    if (!request) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('medical_requests')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({ title: 'Request marked as sent' });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: 'Error updating request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!request) return null;

  const requestTypeLabel =
    REQUEST_TYPES.find((t) => t.value === request.request_type)?.label ||
    request.request_type;
  const turnaroundDays = calculateTurnaroundDays(request.received_at, request.sent_at);
  const daysPending =
    request.status !== 'sent' ? calculateDaysPending(request.received_at) : null;

  const statusColors: Record<string, string> = {
    received: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    assigned: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    in_progress: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    sent: 'bg-green-500/10 text-green-600 border-green-500/20',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Request Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status & Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={statusColors[request.status] || ''}
            >
              {request.status.replace(/_/g, ' ')}
            </Badge>
            <Badge variant="secondary">{requestTypeLabel}</Badge>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Received</p>
                <p className="font-medium">
                  {format(new Date(request.received_at), 'PPP')}
                </p>
              </div>
            </div>

            {gpName && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Assigned to</p>
                  <p className="font-medium">{gpName}</p>
                </div>
              </div>
            )}

            {request.sent_at && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Sent</p>
                  <p className="font-medium">
                    {format(new Date(request.sent_at), 'PPP')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Turnaround / Pending */}
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              {turnaroundDays !== null ? (
                <>
                  <p className="text-sm text-muted-foreground">Turnaround Time</p>
                  <p className="font-medium">{turnaroundDays} days</p>
                </>
              ) : daysPending !== null ? (
                <>
                  <p className="text-sm text-muted-foreground">Days Pending</p>
                  <p
                    className={`font-medium ${
                      daysPending > 7 ? 'text-destructive' : ''
                    }`}
                  >
                    {daysPending} days
                    {daysPending > 7 && ' (overdue)'}
                  </p>
                </>
              ) : null}
            </div>
          </div>

          {/* Notes */}
          {request.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{request.notes}</p>
              </div>
            </>
          )}

          {/* Patient Reference */}
          {request.emis_hash && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Patient Reference
              </p>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {request.emis_hash}
              </code>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {request.status !== 'sent' && !request.assigned_gp_id && (
            <Button variant="outline" onClick={onAssignGP}>
              <User className="h-4 w-4 mr-2" />
              Assign GP
            </Button>
          )}
          {request.status !== 'sent' && (
            <Button onClick={handleMarkAsSent} disabled={loading}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? 'Updating...' : 'Mark as Sent'}
            </Button>
          )}
          {request.status === 'sent' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
