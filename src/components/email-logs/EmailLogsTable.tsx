import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmailStatusBadge } from './EmailStatusBadge';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  email_type: string;
  subject: string;
  status: string;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
}

interface EmailLogsTableProps {
  logs: EmailLog[];
  onViewDetails: (log: EmailLog) => void;
}

export function EmailLogsTable({ logs, onViewDetails }: EmailLogsTableProps) {
  const { t } = useTranslation();

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '-';
    return format(new Date(timestamp), 'dd MMM yyyy HH:mm');
  };

  const getLatestStatusTime = (log: EmailLog) => {
    if (log.clicked_at) return formatTimestamp(log.clicked_at);
    if (log.opened_at) return formatTimestamp(log.opened_at);
    if (log.bounced_at) return formatTimestamp(log.bounced_at);
    if (log.delivered_at) return formatTimestamp(log.delivered_at);
    return '-';
  };

  const getEmailTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      policy_review: 'Policy Review',
      policy_acknowledgment_reminder: 'Acknowledgment Reminder',
      policy_escalation: 'Policy Escalation',
    };
    return typeMap[type] || type;
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t('email_logs.no_logs')}
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Sent At</TableHead>
            <TableHead>Latest Update</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onViewDetails(log)}>
              <TableCell>
                <EmailStatusBadge status={log.status} />
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {getEmailTypeLabel(log.email_type)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{log.recipient_name || log.recipient_email}</span>
                  {log.recipient_name && (
                    <span className="text-xs text-muted-foreground">{log.recipient_email}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatTimestamp(log.sent_at)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {getLatestStatusTime(log)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(log);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {t('email_logs.view_details')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
