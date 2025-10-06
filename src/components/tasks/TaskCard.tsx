import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, AlertCircle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { RAGBadge } from '@/components/dashboard/RAGBadge';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string;
    module: string;
    status: string;
    priority: string;
    due_at: string;
    assigned_to_user_id: string;
    requires_photo: boolean;
    assignedUser?: {
      name: string;
    } | null;
  };
  isMyTask: boolean;
  onRefresh: () => void;
}

export function TaskCard({ task, isMyTask }: TaskCardProps) {
  const navigate = useNavigate();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'green';
      case 'in_progress':
        return 'amber';
      default:
        return 'red';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const isOverdue = task.status !== 'complete' && new Date(task.due_at) < new Date();
  const dueDate = new Date(task.due_at);
  const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className={`hover:shadow-lg transition-shadow ${isMyTask ? 'border-primary' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
          <RAGBadge status={getStatusColor(task.status)} />
        </div>
        <div className="flex gap-2 mt-2">
          <Badge variant="outline">{task.module.replace('_', ' ')}</Badge>
          <Badge variant={getPriorityVariant(task.priority)}>
            {task.priority}
          </Badge>
          {task.requires_photo && (
            <Badge variant="secondary">Photo Required</Badge>
          )}
          {isMyTask && (
            <Badge className="bg-primary">Assigned to Me</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {task.description || 'No description available'}
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {getStatusIcon(task.status)}
            <span className="capitalize">{task.status.replace('_', ' ')}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className={isOverdue ? 'text-destructive font-medium' : ''}>
              {dueDate.toLocaleDateString()}
              {isOverdue ? ' (Overdue)' : daysUntilDue >= 0 ? ` (${daysUntilDue}d)` : ''}
            </span>
          </div>

          {task.assignedUser && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{task.assignedUser.name}</span>
            </div>
          )}
        </div>

        <Button
          className="w-full"
          onClick={() => navigate(`/task/${task.id}`)}
          disabled={task.status === 'complete'}
        >
          {task.status === 'complete' ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Completed
            </>
          ) : task.status === 'in_progress' ? (
            <>
              Continue Task
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              Start Task
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
