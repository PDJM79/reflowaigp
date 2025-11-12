import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface IPCAuditCardProps {
  audit: {
    id: string;
    period_month: number;
    period_year: number;
    status: string;
    completed_at: string | null;
    location_scope: string;
  };
  onView: (id: string) => void;
}

export function IPCAuditCard({ audit, onView }: IPCAuditCardProps) {
  const getStatusIcon = () => {
    switch (audit.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-amber-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      in_progress: "secondary",
      completed: "default"
    };
    return <Badge variant={variants[audit.status] || "outline"}>{audit.status.replace('_', ' ')}</Badge>;
  };

  const monthName = new Date(audit.period_year, audit.period_month - 1).toLocaleDateString('en-GB', { month: 'long' });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">
              {monthName} {audit.period_year} IPC Audit
            </CardTitle>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="capitalize">{audit.location_scope.replace('_', ' ')}</span>
        </div>
        
        {audit.completed_at && (
          <p className="text-sm text-muted-foreground">
            Completed: {format(new Date(audit.completed_at), 'dd MMM yyyy')}
          </p>
        )}

        <Button 
          onClick={() => onView(audit.id)} 
          variant="outline" 
          className="w-full"
        >
          {audit.status === 'completed' ? 'View Audit' : 'Continue Audit'}
        </Button>
      </CardContent>
    </Card>
  );
}
