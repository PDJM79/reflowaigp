import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmailStatusBadge } from './EmailStatusBadge';
import { Copy, CheckCircle2, XCircle, Clock, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface EmailLogDetailDialogProps {
  log: any;
  open: boolean;
  onClose: () => void;
}

export function EmailLogDetailDialog({ log, open, onClose }: EmailLogDetailDialogProps) {
  const { t } = useTranslation();

  if (!log) return null;

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return null;
    return format(new Date(timestamp), 'dd MMM yyyy HH:mm:ss');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const timeline = [
    { label: 'Sent', timestamp: log.sent_at, icon: Mail, color: 'text-blue-500' },
    { label: 'Delivered', timestamp: log.delivered_at, icon: CheckCircle2, color: 'text-success' },
    { label: 'Opened', timestamp: log.opened_at, icon: CheckCircle2, color: 'text-success' },
    { label: 'Clicked', timestamp: log.clicked_at, icon: CheckCircle2, color: 'text-success' },
    { label: 'Bounced', timestamp: log.bounced_at, icon: XCircle, color: 'text-error' },
    { label: 'Complained', timestamp: log.complained_at, icon: XCircle, color: 'text-error' },
  ].filter(item => item.timestamp);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Delivery Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Overview */}
          <div className="flex items-center justify-between">
            <EmailStatusBadge status={log.status} />
            <Badge variant="outline">{log.email_type.replace(/_/g, ' ')}</Badge>
          </div>

          {/* Recipient Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Recipient</h3>
            <div className="space-y-1">
              {log.recipient_name && (
                <p className="font-medium">{log.recipient_name}</p>
              )}
              <p className="text-sm text-muted-foreground">{log.recipient_email}</p>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Subject</h3>
            <p>{log.subject}</p>
          </div>

          {/* Resend Email ID */}
          {log.resend_email_id && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Resend Email ID</h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                  {log.resend_email_id}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(log.resend_email_id)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Status Timeline</h3>
              <div className="space-y-3">
                {timeline.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 ${item.color} mt-0.5`} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {log.error_message && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-error">Error Message</h3>
              <div className="p-3 bg-error/10 border border-error/20 rounded text-sm">
                {log.error_message}
              </div>
            </div>
          )}

          {/* Bounce Details */}
          {(log.bounce_type || log.bounce_reason) && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-error">Bounce Details</h3>
              <div className="space-y-1">
                {log.bounce_type && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Type:</span> {log.bounce_type}
                  </p>
                )}
                {log.bounce_reason && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Reason:</span> {log.bounce_reason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Metadata</h3>
              <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
