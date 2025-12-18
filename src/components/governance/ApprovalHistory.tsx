import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, AlertTriangle, Clock, History } from 'lucide-react';
import { ApprovalHistoryItem, ApprovalDecision, ENTITY_TYPE_LABELS, DECISION_LABELS } from './types';
import { format } from 'date-fns';

interface ApprovalHistoryProps {
  items: ApprovalHistoryItem[];
  maxHeight?: string;
  title?: string;
}

const decisionIcons: Record<ApprovalDecision, typeof CheckCircle> = {
  approved: CheckCircle,
  pending: Clock,
  rejected: XCircle,
  pending_changes: AlertTriangle,
};

const decisionColors: Record<ApprovalDecision, string> = {
  approved: 'text-success',
  pending: 'text-warning',
  rejected: 'text-destructive',
  pending_changes: 'text-warning',
};

export function ApprovalHistory({ 
  items, 
  maxHeight = '400px',
  title = 'Approval History' 
}: ApprovalHistoryProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No approval history yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ maxHeight }} className="pr-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
            
            <div className="space-y-6">
              {items.map((item, index) => {
                const Icon = decisionIcons[item.decision];
                const colorClass = decisionColors[item.decision];
                
                return (
                  <div key={item.id} className="relative pl-8">
                    {/* Timeline dot */}
                    <div className={`absolute left-0 top-1 h-6 w-6 rounded-full bg-background border-2 flex items-center justify-center ${colorClass}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {ENTITY_TYPE_LABELS[item.entityType]}
                        </Badge>
                        <Badge 
                          variant={item.decision === 'approved' ? 'default' : 'secondary'}
                          className={item.decision === 'approved' ? 'bg-success text-success-foreground' : ''}
                        >
                          {DECISION_LABELS[item.decision]}
                        </Badge>
                      </div>
                      
                      <h4 className="font-medium text-sm">{item.entityName}</h4>
                      
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {item.approverName && (
                          <p>
                            By: <span className="text-foreground">{item.approverName}</span>
                            {item.reviewerTitle && ` (${item.reviewerTitle})`}
                          </p>
                        )}
                        <p>{format(new Date(item.approvedAt), 'dd MMM yyyy, HH:mm')}</p>
                        {item.digitalSignature && (
                          <p className="italic">Signed: {item.digitalSignature}</p>
                        )}
                      </div>
                      
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
