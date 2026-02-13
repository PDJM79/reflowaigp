import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGovernanceApprovals } from '@/hooks/useGovernanceApprovals';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Stamp,
  FileText,
  Flame,
  ShieldCheck,
  DoorOpen,
  Receipt,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  BulkApprovalDialog,
  ApprovalHistory,
  PendingApprovalItem,
  ApprovableEntityType,
  ENTITY_TYPE_LABELS,
  URGENCY_COLORS,
} from '@/components/governance';
import { generateGovernanceReportPDF } from '@/lib/pdfExportV2';
import { toast } from '@/hooks/use-toast';

const entityIcons: Record<ApprovableEntityType, typeof FileText> = {
  policy: FileText,
  fire_safety_assessment: Flame,
  ipc_audit: ShieldCheck,
  room_assessment: DoorOpen,
  claim_run: Receipt,
};

export default function GovernanceDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [practiceName, setPracticeName] = useState<string>('Practice');

  // Fetch user's practice ID
  useEffect(() => {
    async function fetchPracticeId() {
      if (!user?.id) return;
      const { data } = await supabase
        .from('users')
        .select('practice_id, practices(name)')
        .eq('id', user.id)
        .single();
      if (data?.practice_id) {
        setPracticeId(data.practice_id);
        setPracticeName((data.practices as any)?.name || 'Practice');
      }
    }
    fetchPracticeId();
  }, [user?.id]);

  const {
    pendingItems,
    historyItems,
    stats,
    loading,
    filters,
    setFilters,
    refresh,
  } = useGovernanceApprovals(practiceId);

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)));
    }
  };

  const filteredItems = pendingItems.filter((item) => {
    const matchesSearch = item.entityName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || item.entityType === typeFilter;
    return matchesSearch && matchesType;
  });

  const selectedApprovalItems = filteredItems.filter((item) => selectedItems.has(item.id));

  const handleExportPDF = async () => {
    try {
      await generateGovernanceReportPDF({
        practiceName,
        pendingItems,
        historyItems,
        stats,
      });
      toast({ title: 'PDF exported successfully' });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: 'Failed to export PDF', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Stamp className="h-8 w-8" />
            Governance Approvals
          </h1>
          <p className="text-muted-foreground">
            Formal sign-off tracking and regulatory audit trail
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalPending}</div>
            <p className="text-xs text-muted-foreground">Awaiting sign-off</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingPolicies}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingAssessments}</div>
            <p className="text-xs text-muted-foreground">Fire, IPC, Room</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{stats.approvedThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 inline mr-1" />
              Completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48"
              />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="policy">Policies</SelectItem>
                  <SelectItem value="fire_safety_assessment">Fire Safety</SelectItem>
                  <SelectItem value="ipc_audit">IPC Audits</SelectItem>
                  <SelectItem value="room_assessment">Room Assessments</SelectItem>
                  <SelectItem value="claim_run">Claim Runs</SelectItem>
                </SelectContent>
              </Select>
              {selectedItems.size > 0 && (
                <Button onClick={() => setBulkDialogOpen(true)}>
                  Approve Selected ({selectedItems.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm">No pending approvals at this time.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const Icon = entityIcons[item.entityType];
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleSelectItem(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline" className="text-xs">
                            {ENTITY_TYPE_LABELS[item.entityType]}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.entityName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(item.requestedAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.urgency === 'high' ? 'destructive' : 'secondary'}
                          className={item.urgency === 'high' ? '' : URGENCY_COLORS[item.urgency]}
                        >
                          {item.urgency === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedItems(new Set([item.id]));
                            setBulkDialogOpen(true);
                          }}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approval History Collapsible */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Approval History ({historyItems.length})
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <ApprovalHistory items={historyItems} maxHeight="500px" />
        </CollapsibleContent>
      </Collapsible>

      {/* Bulk Approval Dialog */}
      <BulkApprovalDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        selectedItems={selectedApprovalItems}
        onComplete={() => {
          setSelectedItems(new Set());
          refresh();
        }}
        practiceId={practiceId || ''}
      />
    </div>
  );
}
