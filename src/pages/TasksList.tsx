import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Calendar, User, AlertCircle } from 'lucide-react';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Task {
  id: string;
  title: string;
  description: string;
  module: string;
  status: string;
  priority: string;
  due_at: string;
  assigned_to_user_id: string;
  assigned_to_role: string;
  requires_photo: boolean;
  created_at: string;
  assignedUser?: {
    name: string;
    email: string;
  } | null;
  task_templates?: {
    title: string;
  } | null;
}

export default function TasksList() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchTasks();
  }, [user, navigate, selectedModule, selectedStatus, selectedPriority, showMyTasks]);

  const fetchTasks = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;
      setCurrentUserId(userData.id);

      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignedUser:users!tasks_assigned_to_user_id_fkey(name, email),
          task_templates(title)
        `)
        .eq('practice_id', userData.practice_id)
        .order('due_at', { ascending: true });

      if (selectedModule !== 'all') {
        query = query.eq('module', selectedModule);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      if (selectedPriority !== 'all') {
        query = query.eq('priority', selectedPriority);
      }

      if (showMyTasks) {
        query = query.eq('assigned_to_user_id', userData.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const openTasks = filteredTasks.filter(t => t.status === 'open');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'complete');
  const overdueTasks = filteredTasks.filter(t => 
    t.status !== 'complete' && new Date(t.due_at) < new Date()
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('tasks.title')}</h1>
          <p className="text-muted-foreground">{t('tasks.description')}</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('tasks.create')}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks.length}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueTasks.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('tasks.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('tasks.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="month_end">Month-End</SelectItem>
                <SelectItem value="claims">Claims</SelectItem>
                <SelectItem value="infection_control">IC Audit</SelectItem>
                <SelectItem value="cleaning">Cleaning</SelectItem>
                <SelectItem value="incidents">Incidents</SelectItem>
                <SelectItem value="fire_safety">Fire & H&S</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="complaints">Complaints</SelectItem>
                <SelectItem value="medical_requests">Medicals</SelectItem>
                <SelectItem value="policies">Policies</SelectItem>
                <SelectItem value="fridge_temps">Fridge Temps</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showMyTasks ? "default" : "outline"}
              onClick={() => setShowMyTasks(!showMyTasks)}
            >
              <User className="h-4 w-4 mr-2" />
              My Tasks
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No tasks found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isMyTask={task.assigned_to_user_id === currentUserId}
              onRefresh={fetchTasks}
            />
          ))}
        </div>
      )}

      <TaskDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onSuccess={() => {
          setShowDialog(false);
          fetchTasks();
        }}
      />
    </div>
  );
}
