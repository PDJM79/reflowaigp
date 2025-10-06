import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplet, Calendar, ListChecks } from 'lucide-react';

export default function Cleaning() {
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
    fetchCleaningTasks();
  }, [user, navigate]);

  const fetchCleaningTasks = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .eq('module', 'cleaning')
        .order('due_at', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching cleaning tasks:', error);
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
            <Droplet className="h-8 w-8" />
            {t('cleaning.title')}
          </h1>
          <p className="text-muted-foreground">Daily cleaning schedules and room checks</p>
        </div>
        <Button onClick={() => navigate('/tasks?module=cleaning')}>
          <ListChecks className="h-4 w-4 mr-2" />
          View All Cleaning Tasks
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Tasks</CardTitle>
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
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasks.length}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading cleaning data...</div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Droplet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No cleaning tasks yet</p>
            <p className="text-sm text-muted-foreground">
              Create cleaning tasks from the Task Templates page or Tasks module
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
                    <span className="text-sm">{new Date(task.due_at).toLocaleDateString()}</span>
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
