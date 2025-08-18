import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/layout/AppHeader';
import { ArrowLeft, AlertTriangle, Clock, User, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RAGBadge } from '@/components/dashboard/RAGBadge';

interface RiskProcess {
  id: string;
  status: string;
  due_at: string;
  created_at: string;
  process_templates: {
    name: string;
    responsible_role: string;
    frequency: string;
  };
  users: {
    name: string;
    role: string;
  };
  risk_level: 'high' | 'medium' | 'low';
  days_overdue: number;
}

export default function RiskRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [riskProcesses, setRiskProcesses] = useState<RiskProcess[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRiskProcesses = async () => {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('practice_id')
          .eq('auth_user_id', user.id)
          .single();

        if (!userData) return;

        const { data: processInstances } = await supabase
          .from('process_instances')
          .select(`
            *,
            process_templates!inner (
              name,
              responsible_role,
              frequency
            ),
            users!assignee_id (
              name,
              role
            )
          `)
          .eq('practice_id', userData.practice_id)
          .neq('status', 'complete')
          .order('due_at', { ascending: true });

        // Calculate risk levels and filter only at-risk processes
        const riskyProcesses = (processInstances || [])
          .map(process => {
            const dueDate = new Date(process.due_at);
            const today = new Date();
            const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            
            let risk_level: 'high' | 'medium' | 'low' = 'low';
            
            // Determine risk level based on overdue status and process status
            if (daysOverdue > 7) {
              risk_level = 'high';
            } else if (daysOverdue > 0 || process.status === 'pending') {
              risk_level = 'medium';
            }

            return {
              ...process,
              risk_level,
              days_overdue: Math.max(0, daysOverdue)
            };
          })
          .filter(process => process.risk_level !== 'low'); // Only show medium and high risk

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

  const highRiskCount = riskProcesses.filter(p => p.risk_level === 'high').length;
  const mediumRiskCount = riskProcesses.filter(p => p.risk_level === 'medium').length;

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

        {/* Risk Summary */}
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

        {/* Risk Processes */}
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
                    // Sort by risk level (high -> medium -> low), then by days overdue
                    const riskOrder = { high: 3, medium: 2, low: 1 };
                    if (riskOrder[a.risk_level] !== riskOrder[b.risk_level]) {
                      return riskOrder[b.risk_level] - riskOrder[a.risk_level];
                    }
                    return b.days_overdue - a.days_overdue;
                  })
                  .map((process) => (
                    <div 
                      key={process.id}
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => navigate(`/task/${process.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <RAGBadge status={getRAGStatus(process.risk_level)} />
                        <div>
                          <h3 className="font-medium">{process.process_templates?.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {new Date(process.due_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {process.users?.name || 'Unassigned'}
                            </span>
                            {process.days_overdue > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {process.days_overdue} days overdue
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`${getRiskColor(process.risk_level)} border`}
                        >
                          {process.risk_level.toUpperCase()} RISK
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