import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Search, ChevronLeft, ChevronRight, Monitor } from 'lucide-react';
import { useAuditLogs, type AuditLog } from '@/hooks/useAuditLogs';
import { useCapabilities } from '@/hooks/useCapabilities';
import { format } from 'date-fns';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENTITY_TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'users', label: 'Users' },
  { value: 'practice', label: 'Practice' },
  { value: 'incidents', label: 'Incidents' },
  { value: 'complaints', label: 'Complaints' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'policies', label: 'Policies' },
  { value: 'training-records', label: 'Training Records' },
  { value: 'process-templates', label: 'Process Templates' },
  { value: 'employees', label: 'Employees' },
];

const ACTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
];

const ACTION_BADGE: Record<string, { label: string; className: string }> = {
  create: { label: 'Create', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  update: { label: 'Update', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  delete: { label: 'Delete', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

const ENTITY_LABELS: Record<string, string> = {
  'users': 'Users',
  'practice': 'Practice',
  'incidents': 'Incidents',
  'complaints': 'Complaints',
  'tasks': 'Tasks',
  'policies': 'Policies',
  'training-records': 'Training Records',
  'process-templates': 'Process Templates',
  'employees': 'Employees',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortenId(id: string) {
  return `${id.slice(0, 8)}…`;
}

function formatTs(ts: string) {
  return format(new Date(ts), 'dd MMM yyyy HH:mm:ss');
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

function AuditDetailDialog({ log, onClose }: { log: AuditLog | null; onClose: () => void }) {
  if (!log) return null;

  const actionStyle = ACTION_BADGE[log.action] ?? { label: log.action, className: '' };

  return (
    <Dialog open={!!log} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            Audit Entry Detail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground mb-1">Timestamp</p>
              <p className="font-mono">{formatTs(log.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Action</p>
              <Badge className={actionStyle.className}>{actionStyle.label}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Entity Type</p>
              <p>{ENTITY_LABELS[log.entity_type] ?? log.entity_type}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Entity ID</p>
              <p className="font-mono text-xs break-all">{log.entity_id}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">User</p>
              <p>{log.user_name ?? <span className="text-muted-foreground italic">System</span>}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">IP Address</p>
              <p className="font-mono">{log.ip_address ?? '—'}</p>
            </div>
          </div>

          {log.user_agent && (
            <div>
              <p className="text-muted-foreground mb-1 flex items-center gap-1">
                <Monitor className="h-3 w-3" /> User Agent
              </p>
              <p className="font-mono text-xs break-all text-muted-foreground">{log.user_agent}</p>
            </div>
          )}

          {log.after_data && (
            <div>
              <p className="text-muted-foreground mb-1">After Data</p>
              <ScrollArea className="h-48 rounded border bg-muted/40 p-3">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(log.after_data, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLogs() {
  const { hasCapability } = useCapabilities();
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('all');
  const [action, setAction] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const PAGE_SIZE = 25;

  const { logs, totalCount, loading, error } = useAuditLogs({
    search,
    entityType,
    action,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Guard: only practice managers / manage_users capability
  if (!hasCapability('manage_users')) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-64 gap-3">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          You don't have permission to view audit logs.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BackButton />
            <h1 className="text-3xl font-bold">Audit Logs</h1>
          </div>
          <p className="text-muted-foreground">
            Immutable record of all data changes within your practice.
          </p>
        </div>
        {!loading && (
          <p className="text-sm text-muted-foreground shrink-0">
            {totalCount.toLocaleString()} {totalCount === 1 ? 'entry' : 'entries'}
          </p>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by entity ID or type…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Change History
          </CardTitle>
          <CardDescription>Click any row to inspect the full payload.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-12 text-center text-destructive">
              <p>Failed to load audit logs: {error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No audit entries found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">Timestamp</TableHead>
                    <TableHead className="w-28">Action</TableHead>
                    <TableHead className="w-36">Entity Type</TableHead>
                    <TableHead className="w-28">Entity ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="w-28">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const badge = ACTION_BADGE[log.action] ?? { label: log.action, className: '' };
                    return (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatTs(log.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge className={badge.className}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {shortenId(log.entity_id)}
                        </TableCell>
                        <TableCell>
                          {log.user_name ?? (
                            <span className="text-muted-foreground italic text-xs">System</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {log.ip_address ?? '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AuditDetailDialog log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
