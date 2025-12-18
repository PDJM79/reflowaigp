import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { ApprovalDecision, ApprovableEntityType, ENTITY_TYPE_LABELS, DECISION_LABELS } from './types';
import { format } from 'date-fns';

interface GovernanceApprovalCardProps {
  entityType: ApprovableEntityType;
  entityName: string;
  decision: ApprovalDecision;
  approverName?: string | null;
  approvedAt?: string | null;
  digitalSignature?: string | null;
  reviewerTitle?: string | null;
  onRequestApproval?: () => void;
  onViewHistory?: () => void;
  showActions?: boolean;
}

const decisionConfig: Record<ApprovalDecision, { icon: typeof CheckCircle; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  approved: { icon: CheckCircle, variant: 'default', className: 'bg-success text-success-foreground' },
  pending: { icon: Clock, variant: 'secondary', className: 'bg-warning/20 text-warning' },
  rejected: { icon: XCircle, variant: 'destructive', className: '' },
  pending_changes: { icon: AlertTriangle, variant: 'outline', className: 'border-warning text-warning' },
};

export function GovernanceApprovalCard({
  entityType,
  entityName,
  decision,
  approverName,
  approvedAt,
  digitalSignature,
  reviewerTitle,
  onRequestApproval,
  onViewHistory,
  showActions = true,
}: GovernanceApprovalCardProps) {
  const config = decisionConfig[decision];
  const Icon = config.icon;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {ENTITY_TYPE_LABELS[entityType]}
              </Badge>
              <Badge variant={config.variant} className={config.className}>
                <Icon className="h-3 w-3 mr-1" />
                {DECISION_LABELS[decision]}
              </Badge>
            </div>
            
            <h4 className="font-medium truncate">{entityName}</h4>
            
            {decision === 'approved' && approverName && (
              <div className="mt-2 text-sm text-muted-foreground space-y-1">
                <p>Approved by: <span className="text-foreground">{approverName}</span></p>
                {reviewerTitle && <p className="text-xs">{reviewerTitle}</p>}
                {approvedAt && (
                  <p className="text-xs">
                    {format(new Date(approvedAt), 'dd MMM yyyy, HH:mm')}
                  </p>
                )}
                {digitalSignature && (
                  <p className="text-xs italic">Signed: {digitalSignature}</p>
                )}
              </div>
            )}
          </div>
          
          {showActions && (
            <div className="flex flex-col gap-2">
              {decision === 'pending' && onRequestApproval && (
                <Button size="sm" onClick={onRequestApproval}>
                  Request Approval
                </Button>
              )}
              {onViewHistory && (
                <Button size="sm" variant="outline" onClick={onViewHistory}>
                  <Eye className="h-4 w-4 mr-1" />
                  History
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
