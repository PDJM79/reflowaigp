import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  FileCheck,
  Plus,
  Calendar,
  UserCheck,
  Download,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMasterUser } from '@/hooks/useMasterUser';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { generateMedicalRequestsReportPDF } from '@/lib/pdfExportV2';
import {
  MedicalRequestDialog,
  AssignGPDialog,
  RequestDetailDialog,
  TurnaroundAnalytics,
  RequestFilters,
  REQUEST_TYPES,
  calculateDaysPending,
  type MedicalRequest,
  type RequestFiltersState,
} from '@/components/medical-requests';

export default function MedicalRequests() {
  const { user } = useAuth();
  const { isMasterUser, selectedPracticeId } = useMasterUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [requests, setRequests] = useState<MedicalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [practiceName, setPracticeName] = useState<string>('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Dialog states
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MedicalRequest | null>(null);

  // Filters
  const [filters, setFilters] = useState<RequestFiltersState>({
    status: 'all',
    type: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    initializePractice();
  }, [user, selectedPracticeId]);

  const initializePractice = async () => {
    try {
      const pid = selectedPracticeId || user?.practiceId;
      if (!pid) return;

      setPracticeId(pid);

      // Fetch practice name
      const { data: practiceData } = await supabase
        .from('practices')
        .select('name')
        .eq('id', pid)
        .single();

      setPracticeName(practiceData?.name || 'Practice');
      await fetchRequests(pid);
    } catch (error) {
      console.error('Error initializing:', error);
    }
  };

  const fetchRequests = async (pid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_requests')
        .select('*')
        .eq('practice_id', pid)
        .order('received_at', { ascending: false });

      if (error) throw error;
      setRequests((data as MedicalRequest[]) || []);
    } catch (error) {
      console.error('Error fetching medical requests:', error);
      toast({
        title: 'Error loading requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Status filter
      if (filters.status !== 'all' && r.status !== filters.status) return false;

      // Type filter
      if (filters.type !== 'all' && r.request_type !== filters.type) return false;

      // Date range filter
      if (filters.dateFrom) {
        const receivedDate = new Date(r.received_at);
        const fromDate = new Date(filters.dateFrom);
        if (receivedDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const receivedDate = new Date(r.received_at);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59);
        if (receivedDate > toDate) return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesNotes = r.notes?.toLowerCase().includes(searchLower);
        const matchesEmis = r.emis_hash?.toLowerCase().includes(searchLower);
        if (!matchesNotes && !matchesEmis) return false;
      }

      return true;
    });
  }, [requests, filters]);

  // Summary counts
  const receivedCount = requests.filter((r) => r.status === 'received').length;
  const assignedCount = requests.filter((r) => r.status === 'assigned').length;
  const sentCount = requests.filter((r) => r.status === 'sent').length;

  const handleRequestClick = (request: MedicalRequest) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleAssignGP = (request: MedicalRequest) => {
    setSelectedRequest(request);
    setAssignDialogOpen(true);
  };

  const handleExportPDF = async () => {
    if (!practiceId) return;

    try {
      // Calculate metrics
      const completed = requests.filter((r) => r.status === 'sent' && r.sent_at);
      const pending = requests.filter((r) => r.status !== 'sent');

      const turnaroundDays = completed
        .map((r) => {
          if (!r.sent_at) return null;
          const diff = new Date(r.sent_at).getTime() - new Date(r.received_at).getTime();
          return Math.ceil(diff / (1000 * 60 * 60 * 24));
        })
        .filter((d): d is number => d !== null);

      const avgTurnaround =
        turnaroundDays.length > 0
          ? Math.round(turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length)
          : 0;

      const byType = REQUEST_TYPES.reduce((acc, type) => {
        acc[type.value] = requests.filter((r) => r.request_type === type.value).length;
        return acc;
      }, {} as Record<string, number>);

      const exporter = generateMedicalRequestsReportPDF({
        practiceName,
        dateRange: {
          from: format(new Date(new Date().setFullYear(new Date().getFullYear() - 1)), 'dd/MM/yyyy'),
          to: format(new Date(), 'dd/MM/yyyy'),
        },
        requests: requests.map((r) => ({
          id: r.id,
          request_type: r.request_type,
          status: r.status,
          received_at: r.received_at,
          sent_at: r.sent_at,
          notes: r.notes,
          assigned_gp_name: null,
        })),
        metrics: {
          totalReceived: requests.length,
          totalCompleted: completed.length,
          averageTurnaround: avgTurnaround,
          pendingOver7Days: pending.filter((r) => calculateDaysPending(r.received_at) > 7).length,
          byType,
        },
      });

      exporter.save(`medical-requests-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast({ title: 'PDF exported successfully' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({ title: 'Error exporting PDF', variant: 'destructive' });
    }
  };

  const handleRefresh = () => {
    if (practiceId) fetchRequests(practiceId);
  };

  const statusColors: Record<string, string> = {
    received: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    assigned: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    in_progress: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    sent: 'bg-green-500/10 text-green-600 border-green-500/20',
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileCheck className="h-8 w-8" />
            Insurance & Medical Requests
          </h1>
          <p className="text-muted-foreground">
            Manage insurance forms, medical reports, and third-party requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => setRequestDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Request
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">New Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{receivedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Assigned to GP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{assignedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sentCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Toggle */}
      <Button
        variant="outline"
        onClick={() => setShowAnalytics(!showAnalytics)}
        className="w-full"
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        {showAnalytics ? 'Hide Analytics' : 'Show Turnaround Analytics'}
        {showAnalytics ? (
          <ChevronUp className="h-4 w-4 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-2" />
        )}
      </Button>

      {/* Analytics Section */}
      {showAnalytics && <TurnaroundAnalytics requests={requests} />}

      {/* Filters */}
      <RequestFilters filters={filters} onFiltersChange={setFilters} />

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-8">Loading medical requests...</div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {requests.length === 0
                ? 'No medical requests recorded'
                : 'No requests match your filters'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {filters.status === 'all' && filters.type === 'all'
                ? 'All Requests'
                : 'Filtered Requests'}{' '}
              ({filteredRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredRequests.map((request) => {
                const daysPending =
                  request.status !== 'sent' ? calculateDaysPending(request.received_at) : null;
                const typeLabel =
                  REQUEST_TYPES.find((t) => t.value === request.request_type)?.label ||
                  request.request_type;

                return (
                  <div
                    key={request.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleRequestClick(request)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={statusColors[request.status] || ''}
                          >
                            {request.status.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant="secondary">{typeLabel}</Badge>
                          {daysPending !== null && daysPending > 7 && (
                            <Badge variant="destructive">Overdue ({daysPending}d)</Badge>
                          )}
                        </div>
                        {request.notes && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {request.notes}
                          </p>
                        )}
                      </div>
                      {request.status !== 'sent' && !request.assigned_gp_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignGP(request);
                          }}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Assign
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Received: {format(new Date(request.received_at), 'dd MMM yyyy')}
                      </span>
                      {request.assigned_gp_id && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          Assigned to GP
                        </span>
                      )}
                      {request.sent_at && (
                        <span className="flex items-center gap-1 text-green-600">
                          Sent: {format(new Date(request.sent_at), 'dd MMM yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {practiceId && (
        <>
          <MedicalRequestDialog
            open={requestDialogOpen}
            onOpenChange={setRequestDialogOpen}
            practiceId={practiceId}
            onSuccess={handleRefresh}
          />

          <AssignGPDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            practiceId={practiceId}
            request={selectedRequest}
            onSuccess={handleRefresh}
          />

          <RequestDetailDialog
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
            request={selectedRequest}
            onSuccess={handleRefresh}
            onAssignGP={() => {
              setDetailDialogOpen(false);
              setAssignDialogOpen(true);
            }}
          />
        </>
      )}
    </div>
  );
}
