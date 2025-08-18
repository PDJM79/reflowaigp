import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type RAGStatus = 'green' | 'amber' | 'red';

interface RAGBadgeProps {
  status: RAGStatus;
  className?: string;
  children?: React.ReactNode;
}

export function RAGBadge({ status, className, children }: RAGBadgeProps) {
  const statusStyles = {
    green: 'bg-success text-success-foreground hover:bg-success/90',
    amber: 'bg-warning text-warning-foreground hover:bg-warning/90',
    red: 'bg-error text-error-foreground hover:bg-error/90'
  };

  return (
    <Badge className={cn(statusStyles[status], className)}>
      {children || status.toUpperCase()}
    </Badge>
  );
}