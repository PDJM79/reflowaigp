import { format } from 'date-fns';

export interface EmailLogExportData {
  id: string;
  practice_id: string;
  resend_email_id: string | null;
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
  complained_at: string | null;
  bounce_type: string | null;
  bounce_reason: string | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

const formatTimestamp = (timestamp: string | null): string => {
  if (!timestamp) return '';
  return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss');
};

const escapeCSVValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  
  const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
  
  // Escape double quotes by doubling them
  const escaped = stringValue.replace(/"/g, '""');
  
  // Wrap in quotes if contains comma, newline, or quote
  if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
    return `"${escaped}"`;
  }
  
  return escaped;
};

export function exportEmailLogsToCSV(logs: EmailLogExportData[], filename: string = 'email-logs.csv') {
  // Define CSV headers
  const headers = [
    'ID',
    'Resend Email ID',
    'Recipient Email',
    'Recipient Name',
    'Email Type',
    'Subject',
    'Status',
    'Sent At',
    'Delivered At',
    'Opened At',
    'Clicked At',
    'Bounced At',
    'Complained At',
    'Bounce Type',
    'Bounce Reason',
    'Error Message',
    'Metadata',
    'Created At',
    'Updated At',
  ];

  // Create CSV rows
  const rows = logs.map(log => [
    escapeCSVValue(log.id),
    escapeCSVValue(log.resend_email_id),
    escapeCSVValue(log.recipient_email),
    escapeCSVValue(log.recipient_name),
    escapeCSVValue(log.email_type),
    escapeCSVValue(log.subject),
    escapeCSVValue(log.status),
    escapeCSVValue(formatTimestamp(log.sent_at)),
    escapeCSVValue(formatTimestamp(log.delivered_at)),
    escapeCSVValue(formatTimestamp(log.opened_at)),
    escapeCSVValue(formatTimestamp(log.clicked_at)),
    escapeCSVValue(formatTimestamp(log.bounced_at)),
    escapeCSVValue(formatTimestamp(log.complained_at)),
    escapeCSVValue(log.bounce_type),
    escapeCSVValue(log.bounce_reason),
    escapeCSVValue(log.error_message),
    escapeCSVValue(log.metadata),
    escapeCSVValue(formatTimestamp(log.created_at)),
    escapeCSVValue(formatTimestamp(log.updated_at)),
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export function generateEmailLogsFilename(filters: {
  search?: string;
  status?: string;
  emailType?: string;
  dateRange?: { start: Date; end: Date };
}): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
  const parts = ['email-logs', timestamp];
  
  if (filters.status && filters.status !== 'all') {
    parts.push(filters.status);
  }
  
  if (filters.emailType && filters.emailType !== 'all') {
    parts.push(filters.emailType.replace(/_/g, '-'));
  }

  if (filters.dateRange) {
    const startDate = format(filters.dateRange.start, 'yyyy-MM-dd');
    const endDate = format(filters.dateRange.end, 'yyyy-MM-dd');
    parts.push(`${startDate}_to_${endDate}`);
  }
  
  return `${parts.join('_')}.csv`;
}
