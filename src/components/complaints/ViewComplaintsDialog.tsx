import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { List, Search, CheckCircle, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ViewComplaintsDialogProps {
  children?: React.ReactNode;
}

export function ViewComplaintsDialog({ children }: ViewComplaintsDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  const { data: userData } = useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['complaints-list', userData?.practice_id, statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from('complaints')
        .select('*')
        .eq('practice_id', userData?.practice_id)
        .order('received_at', { ascending: false });

      if (statusFilter !== 'all') {
        if (statusFilter === 'open') {
          query = query.is('closed_at', null);
        } else if (statusFilter === 'closed') {
          query = query.not('closed_at', 'is', null);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!userData?.practice_id && open,
  });

  const closeComplaint = useMutation({
    mutationFn: async (complaintId: string) => {
      const { error } = await (supabase as any)
        .from('complaints')
        .update({ 
          closed_at: new Date().toISOString(),
          sla_status: 'completed',
          status: 'closed'
        })
        .eq('id', complaintId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Complaint marked as closed');
      queryClient.invalidateQueries({ queryKey: ['complaints-list'] });
      queryClient.invalidateQueries({ queryKey: ['complaints-dashboard'] });
      setSelectedComplaint(null);
    },
    onError: (error: any) => {
      toast.error('Failed to close complaint: ' + error.message);
    },
  });

  const filteredComplaints = complaints?.filter((c: any) => {
    const matchesName = !searchName || 
      c.complainant_name?.toLowerCase().includes(searchName.toLowerCase());
    const matchesDate = !searchDate || 
      (c.received_at && c.received_at.startsWith(searchDate));
    return matchesName && matchesDate;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-warning text-warning-foreground">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="border-success text-success">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getSLAStatusBadge = (slaStatus: string, closedAt: string | null) => {
    if (closedAt) {
      return <Badge variant="outline" className="border-success text-success">Completed</Badge>;
    }
    switch (slaStatus) {
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'at_risk':
        return <Badge variant="secondary" className="bg-warning text-warning-foreground">At Risk</Badge>;
      case 'on_track':
        return <Badge variant="outline" className="border-success text-success">On Track</Badge>;
      default:
        return <Badge variant="outline">{slaStatus}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <List className="h-4 w-4 mr-2" />
            View Complaints
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>All Complaints</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <Label htmlFor="search-name" className="sr-only">Search by name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-name"
                placeholder="Search by complainant name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="w-full sm:w-40">
            <Label htmlFor="search-date" className="sr-only">Filter by date</Label>
            <Input
              id="search-date"
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-36">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Complaints Table */}
        <ScrollArea className="h-[400px] rounded-md border">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading complaints...</div>
          ) : filteredComplaints?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No complaints found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>SLA Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints?.map((complaint: any) => (
                  <TableRow 
                    key={complaint.id}
                    className={cn(
                      complaint.sla_status === 'overdue' && !complaint.closed_at && 'bg-destructive/10'
                    )}
                  >
                    <TableCell className="font-medium">
                      {complaint.received_at 
                        ? format(new Date(complaint.received_at), 'dd/MM/yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {complaint.sla_status === 'overdue' && !complaint.closed_at && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        {complaint.complainant_name || 'Anonymous'}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{complaint.channel?.replace('_', ' ') || 'N/A'}</TableCell>
                    <TableCell>{getSeverityBadge(complaint.severity || 'medium')}</TableCell>
                    <TableCell>{getSLAStatusBadge(complaint.sla_status, complaint.closed_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedComplaint(complaint)}
                        >
                          View
                        </Button>
                        {!complaint.closed_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => closeComplaint.mutate(complaint.id)}
                            disabled={closeComplaint.isPending}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Close
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        {/* Complaint Detail Panel */}
        {selectedComplaint && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold">Complaint Details</h3>
              <Button size="sm" variant="ghost" onClick={() => setSelectedComplaint(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-2 text-sm">
              <div><strong>Complainant:</strong> {selectedComplaint.complainant_name || 'Anonymous'}</div>
              <div><strong>Date:</strong> {selectedComplaint.received_at ? format(new Date(selectedComplaint.received_at), 'dd/MM/yyyy HH:mm') : 'N/A'}</div>
              <div><strong>Category:</strong> {selectedComplaint.category?.replace('_', ' ') || 'N/A'}</div>
              <div><strong>Channel:</strong> {selectedComplaint.channel?.replace('_', ' ') || 'N/A'}</div>
              <div><strong>Ack Due:</strong> {selectedComplaint.ack_due ? format(new Date(selectedComplaint.ack_due), 'dd/MM/yyyy') : 'N/A'}</div>
              <div><strong>Final Due:</strong> {selectedComplaint.final_due ? format(new Date(selectedComplaint.final_due), 'dd/MM/yyyy') : 'N/A'}</div>
              <div className="mt-2">
                <strong>Description:</strong>
                <p className="mt-1 text-muted-foreground">{selectedComplaint.description}</p>
              </div>
              {selectedComplaint.closed_at && (
                <div className="mt-2 text-success">
                  <strong>Closed:</strong> {format(new Date(selectedComplaint.closed_at), 'dd/MM/yyyy HH:mm')}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}