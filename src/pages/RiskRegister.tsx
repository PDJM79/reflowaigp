import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/layout/AppHeader';
import { ArrowLeft, AlertTriangle, Clock, User, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RAGBadge } from '@/components/dashboard/RAGBadge';

interface RiskProcess {
  id: string;
  status: string;
  dueAt: string;
  createdAt: string;
  templateName: string;
  responsibleRole: string;
  frequency: string;
  assigneeName: string;
  riskLevel: 'high' | 'medium' | 'low';
  daysOverdue: number;
}

export default function RiskRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [riskProcesses, setRiskProcesses] = useState<RiskProcess[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.practiceId) return;

    const fetchRiskProcesses = async () => {
      try {
        const tasksRes = await fetch(`/api/practices/${user.practiceId}/tasks`, { credentials: 'include' });
        const tasks = tasksRes.ok ? await tasksRes.json() : [];

        const usersRes = await fetch(`/api/practices/${user.practiceId}/users`, { credentials: 'include' });
        const users = usersRes.ok ? await usersRes.json() : [];
        const userMap = new Map((users || []).map((u: any) => [u.id, u.name]));

        const riskyProcesses = (tasks || [])
          .filter((task: any) => task.status !== 'complete')
          .map((task: any) => {
            const dueDate = new Date(task.dueAt);
            const today = new Date();
            const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            
            let riskLevel: 'high' | 'medium' | 'low' = 'low';
            if (daysOverdue > 7) {
              riskLevel = 'high';
            } else if (daysOverdue > 0 || task.status === 'pending') {
              riskLevel = 'medium';
            }

            return {
              id: task.id,
              status: task.status,
              dueAt: task.dueAt,
              createdAt: task.createdAt,
              templateName: task.title || 'Unknown Process',
              responsibleRole: task.assignedToRole || 'staff',
              frequency: task.recurrence || 'one-off',
              assigneeName: userMap.get(task.assignedToUserId) || 'Unassigned',
              riskLevel,
              daysOverdue: Math.max(0, daysOverdue),
            };
          })
          .filter((process: any) => process.riskLevel !== 'low');

        setRiskProcesses(riskyProcesses);
      } catch (error) {
        console.error('Error fetching risk processes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRiskProcesses();
  }, [user]);

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getRAGStatus = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'red';
      case 'medium': return 'amber';
      default: return 'green';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  const highRiskCount = riskProcesses.filter(p => p.riskLevel === 'high').length;
  const mediumRiskCount = riskProcesses.filter(p => p.riskLevel === 'medium').length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-warning" />
              Risk Register
            </h1>
            <p className="text-muted-foreground">
              Processes requiring immediate attention or at risk of non-compliance
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                <h3 className="font-medium">High Risk</h3>
              </div>
              <p className="text-2xl font-bold text-red-600 mt-2">{highRiskCount}</p>
              <p className="text-sm text-muted-foreground">Urgent attention required</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-amber-500 rounded-full"></div>
                <h3 className="font-medium">Medium Risk</h3>
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-2">{mediumRiskCount}</p>
              <p className="text-sm text-muted-foreground">Monitor closely</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="font-medium">Total At Risk</h3>
              </div>
              <p className="text-2xl font-bold text-primary mt-2">{riskProcesses.length}</p>
              <p className="text-sm text-muted-foreground">Processes need action</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>At-Risk Processes</CardTitle>
            <CardDescription>
              Processes sorted by risk level - highest risk first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskProcesses.length > 0 ? (
                riskProcesses
                  .sort((a, b) => {
                    const riskOrder = { high: 3, medium: 2, low: 1 };
                    if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
                      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
                    }
                    return b.daysOverdue - a.daysOverdue;
                  })
                  .map((process) => (
                    <div 
                      key={process.id}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => navigate(`/task/${process.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <RAGBadge status={getRAGStatus(process.riskLevel)} />
                        <div>
                          <h3 className="font-medium">{process.templateName}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {new Date(process.dueAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {process.assigneeName}
                            </span>
                            {process.daysOverdue > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {process.daysOverdue} days overdue
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`${getRiskColor(process.riskLevel)} border`}
                        >
                          {process.riskLevel.toUpperCase()} RISK
                        </Badge>
                        <Button size="sm" variant="outline">
                          Take Action
                        </Button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p className="text-lg font-medium text-green-600 mb-2">No Risks Identified</p>
                  <p>All processes are on track and within acceptable timeframes</p>
                  <p className="text-sm">Keep up the excellent work!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}