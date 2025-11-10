import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, Mail, MousePointerClick, Eye, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailStatusBadgeProps {
  status: string;
  className?: string;
}

export function EmailStatusBadge({ status, className }: EmailStatusBadgeProps) {
  const statusConfig = {
    sent: {
      label: 'Sent',
      icon: Mail,
      className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    },
    delivered: {
      label: 'Delivered',
      icon: CheckCircle2,
      className: 'bg-success/10 text-success border-success/20',
    },
    opened: {
      label: 'Opened',
      icon: Eye,
      className: 'bg-success/10 text-success border-success/20',
    },
    clicked: {
      label: 'Clicked',
      icon: MousePointerClick,
      className: 'bg-success/10 text-success border-success/20',
    },
    bounced: {
      label: 'Bounced',
      icon: XCircle,
      className: 'bg-error/10 text-error border-error/20',
    },
    failed: {
      label: 'Failed',
      icon: XCircle,
      className: 'bg-error/10 text-error border-error/20',
    },
    complained: {
      label: 'Complained',
      icon: AlertTriangle,
      className: 'bg-error/10 text-error border-error/20',
    },
    queued: {
      label: 'Queued',
      icon: Clock,
      className: 'bg-muted text-muted-foreground border-border',
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.queued;
  const Icon = config.icon;

  return (
    <Badge className={cn(config.className, 'gap-1', className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
