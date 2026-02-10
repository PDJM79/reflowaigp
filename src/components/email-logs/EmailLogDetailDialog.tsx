import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmailStatusBadge } from './EmailStatusBadge';
import { Copy, CheckCircle2, XCircle, Clock, Mail, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface EmailLogDetailDialogProps {
  log: any;
  open: boolean;
  onClose: () => void;
}

export function EmailLogDetailDialog({ log, open, onClose }: EmailLogDetailDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [retrying, setRetrying] = useState(false);

  if (!log) return null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      toast.info('Email retry is not yet connected to the backend');
    } catch (error) {
      console.error('Error retrying email:', error);
      toast.error(t('email_logs.retry_error'));
    } finally {
      setRetrying(false);
    }
  };

  const canRetry = ['failed', 'bounced'].includes(log.status);

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return null;
    return format(new Date(timestamp), 'dd MMM yyyy HH:mm:ss');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const timeline = [
    { label: 'Sent', timestamp: log.sent_at || log.sentAt, icon: Mail, color: 'text-blue-500' },
    { label: 'Delivered', timestamp: log.delivered_at || log.deliveredAt, icon: CheckCircle2, color: 'text-success' },
    { label: 'Opened', timestamp: log.opened_at || log.openedAt, icon: CheckCircle2, color: 'text-success' },
    { label: 'Clicked', timestamp: log.clicked_at || log.clickedAt, icon: CheckCircle2, color: 'text-success' },
    { label: 'Bounced', timestamp: log.bounced_at || log.bouncedAt, icon: XCircle, color: 'text-error' },
    { label: 'Complained', timestamp: log.complained_at || log.complainedAt, icon: XCircle, color: 'text-error' },
  ].filter(item => item.timestamp);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Email Delivery Details</DialogTitle>
            {canRetry && (
              <Button
                onClick={handleRetry}
                disabled={retrying}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? t('email_logs.retrying') : t('email_logs.retry')}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <EmailStatusBadge status={log.status} />
            <Badge variant="outline">{(log.email_type || log.emailType || '').replace(/_/g, ' ')}</Badge>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Recipient</h3>
            <div className="space-y-1">
              {(log.recipient_name || log.recipientName) && (
                <p className="font-medium">{log.recipient_name || log.recipientName}</p>
              )}
              <p className="text-sm text-muted-foreground">{log.recipient_email || log.recipientEmail}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground">Subject</h3>
            <p>{log.subject}</p>
          </div>

          {(log.resend_email_id || log.resendEmailId) && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">Resend Email ID</h3>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono">
                  {log.resend_email_id || log.resendEmailId}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(log.resend_email_id || log.resendEmailId)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

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

          {(log.error_message || log.errorMessage) && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-error">Error Message</h3>
              <div className="p-3 bg-error/10 border border-error/20 rounded text-sm">
                {log.error_message || log.errorMessage}
              </div>
            </div>
          )}

          {(log.bounce_type || log.bounceType || log.bounce_reason || log.bounceReason) && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-error">Bounce Details</h3>
              <div className="space-y-1">
                {(log.bounce_type || log.bounceType) && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Type:</span> {log.bounce_type || log.bounceType}
                  </p>
                )}
                {(log.bounce_reason || log.bounceReason) && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Reason:</span> {log.bounce_reason || log.bounceReason}
                  </p>
                )}
              </div>
            </div>
          )}

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