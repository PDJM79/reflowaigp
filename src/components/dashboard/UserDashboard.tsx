import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RAGBadge } from './RAGBadge';
import { LogOut, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export function UserDashboard() {
  const { user, signOut } = useAuth();

  // Mock data for demonstration
  const todaysTasks = [
    {
      id: '1',
      name: 'Vaccine Cold Chain Check',
      dueAt: '17:00',
      status: 'green' as const,
      progress: 0,
      totalSteps: 4
    },
    {
      id: '2', 
      name: 'Resuscitation Equipment Check',
      dueAt: '16:00',
      status: 'amber' as const,
      progress: 2,
      totalSteps: 6
    },
    {
      id: '3',
      name: 'Water Temperature Testing',
      dueAt: '15:00',
      status: 'red' as const,
      progress: 0,
      totalSteps: 3
    }
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">Practice Processes</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user?.email}
            </p>
          </div>
          <Button onClick={signOut} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Your Tasks Today
              </CardTitle>
              <CardDescription>
                Processes due today that require your attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todaysTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {task.status === 'green' && (
                          <CheckCircle className="w-5 h-5 text-success" />
                        )}
                        {task.status === 'amber' && (
                          <Clock className="w-5 h-5 text-warning" />
                        )}
                        {task.status === 'red' && (
                          <AlertCircle className="w-5 h-5 text-error" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{task.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Due by {task.dueAt} • {task.progress}/{task.totalSteps} steps complete
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <RAGBadge status={task.status} />
                      <Button size="sm">
                        {task.progress === 0 ? 'Start' : 'Continue'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">On Track</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">3</div>
                <p className="text-xs text-muted-foreground">Processes</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">1</div>
                <p className="text-xs text-muted-foreground">Processes</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-error">1</div>
                <p className="text-xs text-muted-foreground">Processes</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}