import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Calendar, User, AlertCircle, Loader2, RefreshCw, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { triggerHaptic } from '@/lib/haptics';

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
  completed_at?: string;
  is_auditable?: boolean;
  evidence_min_count?: number;
  evidence_count?: number;
  rank?: number;
  assignedUser?: {
    name: string;
  } | null;
  task_templates?: {
    title: string;
  } | null;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function TasksList() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const currentUserId = user?.id ?? '';
  const [useServerSearch, setUseServerSearch] = useState(false);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search query for server-side search
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  const { scrollableRef, isPulling, pullProgress, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await fetchTasks();
      triggerHaptic('success');
    },
    enabled: isMobile,
  });

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchTasks();
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [selectedModule, selectedStatus, selectedPriority, showMyTasks, page, pageSize, debouncedSearchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedModule, selectedStatus, selectedPriority, showMyTasks, debouncedSearchQuery]);

  // Enable server search when query is non-empty
  useEffect(() => {
    setUseServerSearch(debouncedSearchQuery.length > 0);
  }, [debouncedSearchQuery]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      if (!user?.practiceId) return;

      // Use server-side search RPC when searching
      if (debouncedSearchQuery.length > 0) {
        const { data, error } = await supabase.rpc('search_tasks_secure', {
          p_query: debouncedSearchQuery,
          p_module: selectedModule === 'all' ? null : selectedModule,
          p_status: selectedStatus === 'all' ? null : selectedStatus,
          p_priority: selectedPriority === 'all' ? null : selectedPriority,
          p_only_my_tasks: showMyTasks,
          p_limit: pageSize,
          p_offset: (page - 1) * pageSize,
        });

        if (error) {
          console.error('Search error:', error);
          throw error;
        }

        // Map RPC results to Task interface
        const mappedTasks: Task[] = (data || []).map((t: any) => ({
          ...t,
          requires_photo: false,
          created_at: '',
          assignedUser: null,
          task_templates: null,
        }));

        setTasks(mappedTasks);
        setTotalCount(mappedTasks.length < pageSize ? (page - 1) * pageSize + mappedTasks.length : (page + 1) * pageSize);
        return;
      }

      // Standard query when not searching
      let countQuery = supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('practice_id', user!.practiceId);

      let dataQuery = supabase
        .from('tasks')
        .select(`
          *,
          assignedUser:users!tasks_assigned_to_user_id_fkey(name),
          task_templates(title)
        `)
        .eq('practice_id', user!.practiceId)
        .order('due_at', { ascending: true });

      if (selectedModule !== 'all') {
        countQuery = countQuery.eq('module', selectedModule);
        dataQuery = dataQuery.eq('module', selectedModule);
      }

      if (selectedStatus !== 'all') {
        countQuery = countQuery.eq('status', selectedStatus);
        dataQuery = dataQuery.eq('status', selectedStatus);
      }

      if (selectedPriority !== 'all') {
        countQuery = countQuery.eq('priority', selectedPriority);
        dataQuery = dataQuery.eq('priority', selectedPriority);
      }

      if (showMyTasks) {
        countQuery = countQuery.eq('assigned_to_user_id', user!.id);
        dataQuery = dataQuery.eq('assigned_to_user_id', user!.id);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      dataQuery = dataQuery.range(from, to);

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      setTotalCount(countResult.count || 0);
      setTasks(dataResult.data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats from current page
  const openTasks = tasks.filter(t => t.status === 'open');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'complete' || t.status === 'closed');
  const overdueTasks = tasks.filter(t => 
    t.status !== 'complete' && t.status !== 'closed' && new Date(t.due_at) < new Date()
  );

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / pageSize);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <div ref={scrollableRef} className="space-y-4 sm:space-y-6 p-3 sm:p-6 overflow-y-auto">
      {isMobile && (isPulling || isRefreshing) && (
        <div 
          className="flex items-center justify-center py-4 transition-opacity"
          style={{ opacity: isPulling ? pullProgress : 1 }}
        >
          {isRefreshing ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <RefreshCw 
              className="h-6 w-6 text-primary transition-transform"
              style={{ transform: `rotate(${pullProgress * 360}deg)` }}
            />
          )}
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-2xl sm:text-3xl font-bold">{t('tasks.title')}</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">{t('tasks.description')}</p>
        </div>
        <Button 
          onClick={() => {
            triggerHaptic('light');
            setShowDialog(true);
          }}
          size={isMobile ? 'lg' : 'default'}
          className="w-full sm:w-auto min-h-[44px]"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('tasks.create')}
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Open Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{openTasks.length}</div>
          </CardContent>
        </Card>
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{inProgressTasks.length}</div>
          </CardContent>
        </Card>
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{completedTasks.length}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive touch-manipulation col-span-2 sm:col-span-1">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-destructive">{overdueTasks.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
            {t('tasks.filters')}
            {useServerSearch && (
              <Badge variant="secondary" className="ml-2 text-xs">
                <Search className="h-3 w-3 mr-1" />
                Full-text search
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 min-w-full sm:min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('tasks.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 min-h-[44px]"
                />
              </div>
            </div>

            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
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
              <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]">
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
              size={isMobile ? 'lg' : 'default'}
              className="w-full sm:w-auto min-h-[44px]"
            >
              <User className="h-4 w-4 mr-2" />
              My Tasks
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading tasks...</span>
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No tasks found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <div key={task.id} className="relative">
                {task.is_auditable && (
                  <Badge 
                    variant="outline" 
                    className="absolute -top-2 -right-2 z-10 bg-background text-xs"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    Auditable
                  </Badge>
                )}
                <TaskCard
                  task={task}
                  isMyTask={task.assigned_to_user_id === currentUserId}
                  onRefresh={fetchTasks}
                />
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {startItem}-{endItem} of {totalCount} tasks</span>
              <Select 
                value={pageSize.toString()} 
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[80px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={!canGoPrevious}
                className="min-h-[36px]"
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={!canGoPrevious}
                className="min-h-[36px]"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="px-3 text-sm">
                Page {page} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={!canGoNext}
                className="min-h-[36px]"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={!canGoNext}
                className="min-h-[36px]"
              >
                Last
              </Button>
            </div>
          </div>
        </>
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
