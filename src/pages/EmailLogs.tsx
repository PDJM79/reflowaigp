import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEmailLogs } from '@/hooks/useEmailLogs';
import { EmailLogFilters } from '@/components/email-logs/EmailLogFilters';
import { EmailLogsTable } from '@/components/email-logs/EmailLogsTable';
import { EmailLogDetailDialog } from '@/components/email-logs/EmailLogDetailDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function EmailLogs() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [emailType, setEmailType] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { logs, stats, loading, error } = useEmailLogs({
    search,
    status,
    emailType,
    page: 1,
    pageSize: 50,
  });

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('email_logs.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('email_logs.description')}</p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('email_logs.total_sent')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalSent}</p>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {t('email_logs.delivery_rate')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{stats.deliveryRate}%</p>
              <p className="text-xs text-muted-foreground">Successfully delivered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <XCircle className="h-4 w-4 text-error" />
                {t('email_logs.bounce_rate')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-error">{stats.bounceRate}%</p>
              <p className="text-xs text-muted-foreground">Bounced emails</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                {t('email_logs.open_rate')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-500">{stats.openRate}%</p>
              <p className="text-xs text-muted-foreground">Emails opened</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter email delivery logs</CardDescription>
        </CardHeader>
        <CardContent>
          <EmailLogFilters
            search={search}
            status={status}
            emailType={emailType}
            onSearchChange={setSearch}
            onStatusChange={setStatus}
            onEmailTypeChange={setEmailType}
          />
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Email Logs</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `Showing ${logs.length} email${logs.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-error">
              <p>Error loading email logs: {error}</p>
            </div>
          ) : (
            <EmailLogsTable logs={logs} onViewDetails={handleViewDetails} />
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <EmailLogDetailDialog
        log={selectedLog}
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
      />
    </div>
  );
}
