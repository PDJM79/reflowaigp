import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Calendar, ListChecks, Info } from 'lucide-react';

export default function InfectionControl() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchICTasks();
  }, [user, navigate]);

  const fetchICTasks = async () => {
    if (!user?.practiceId) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/practices/${user.practiceId}/tasks?module=infection_control`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data || []);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching IC tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const openTasks = tasks.filter(t => t.status === 'open');
  const completedTasks = tasks.filter(t => t.status === 'complete');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            {t('infectionControl.title')}
          </h1>
          <p className="text-muted-foreground">Manage infection control audits and compliance</p>
        </div>
        <Button onClick={() => navigate('/tasks?module=infection_control')}>
          <ListChecks className="h-4 w-4 mr-2" />
          View All IC Tasks
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Audits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openTasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedTasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading infection control data...</div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No infection control audits yet</p>
            <p className="text-sm text-muted-foreground">
              Create IC audit tasks from the Task Templates page or Tasks module
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.slice(0, 10).map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/task/${task.id}`)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{new Date(task.dueAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
