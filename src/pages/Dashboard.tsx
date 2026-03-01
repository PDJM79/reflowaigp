import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, AlertTriangle, Clock, Calendar,
  ListTodo, Thermometer, Shield, FileText, Users,
  TrendingUp, XCircle, GitBranch, Droplet,
} from 'lucide-react';
import { format, isToday, isPast, isThisWeek, isThisMonth } from 'date-fns';
import { ReadyForAudit } from '@/components/dashboard/ReadyForAudit';
import { PoliciesNeedingAcknowledgment } from '@/components/dashboard/PoliciesNeedingAcknowledgment';
import { AITaskSuggestions } from '@/components/dashboard/AITaskSuggestions';
import { PracticeScoresCard } from '@/components/dashboard/PracticeScoresCard';
import { ShowProcessDialog } from '@/components/process/ShowProcessDialog';
import { AVAILABLE_ROLES } from '@/types/auth';

type Task = {
  id: string;
  title: string;
  due_at: string;
  status: string;
  priority: string;
  module: string;
};

type SlimTask = {
  id: string;
  due_at: string;
  status: string;
};

const MANAGER_ROLES = new Set([
  'practice_manager', 'administrator', 'nurse_lead',
  'cd_lead_gp', 'ig_lead', 'estates_lead', 'reception_lead', 'auditor',
]);

// ── Cleaner / Reception home page ─────────────────────────────────────────
function CleanerHome({ practiceId, name }: { practiceId: string; name: string }) {
  const [stats, setStats] = useState({ total: 0, completed: 0, zones: 0, loading: true });

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    Promise.all([
      fetch(`/api/practices/${practiceId}/cleaning-tasks`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : []),
      fetch(`/api/practices/${practiceId}/cleaning-logs?date=${today}`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : []),
      fetch(`/api/practices/${practiceId}/cleaning-zones`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : []),
    ]).then(([tasks, logs, zones]) => {
      setStats({
        total: (tasks as { is_active?: boolean }[]).filter(t => t.is_active !== false).length,
        completed: (logs as unknown[]).length,
        zones: (zones as { is_active?: boolean }[]).filter(z => z.is_active !== false).length,
        loading: false,
      });
    }).catch(() => setStats(s => ({ ...s, loading: false })));
  }, [practiceId]);

  const firstName = name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const percent = stats.total > 0
    ? Math.min(100, Math.round((stats.completed / stats.total) * 100))
    : 0;
  const allDone = !stats.loading && stats.total > 0 && stats.completed >= stats.total;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">

        {/* Greeting */}
        <div>
          <p className="text-muted-foreground text-sm font-medium">{greeting},</p>
          <h1 className="text-3xl font-bold mt-0.5">{firstName}!</h1>
        </div>

        {/* Summary card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-br from-teal-600 to-teal-800 p-5 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/20 rounded-full p-2">
                <Droplet className="h-5 w-5" />
              </div>
              <p className="font-medium text-teal-100 text-sm">Today's cleaning schedule</p>
            </div>

            {stats.loading ? (
              <div className="space-y-2">
                <div className="h-7 bg-white/20 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-white/20 rounded animate-pulse w-1/2" />
              </div>
            ) : stats.total === 0 ? (
              <p className="text-lg font-semibold">No tasks configured yet</p>
            ) : (
              <>
                <p className="text-2xl font-bold leading-tight">
                  {stats.total} task{stats.total !== 1 ? 's' : ''}
                </p>
                <p className="text-teal-200 text-sm mt-0.5">
                  across {stats.zones} zone{stats.zones !== 1 ? 's' : ''}
                </p>
              </>
            )}

            <Link to="/cleaning">
              <Button
                className="mt-4 w-full bg-white text-teal-700 hover:bg-teal-50 font-semibold"
                size="lg"
              >
                {allDone ? 'View Cleaning Log' : 'Start Cleaning'}
              </Button>
            </Link>
          </div>
        </Card>

        {/* Progress */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress today</span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {stats.loading ? '—' : `${stats.completed} of ${stats.total}`}
              </span>
            </div>
            <Progress value={stats.loading ? 0 : percent} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {stats.loading
                ? 'Loading…'
                : allDone
                  ? '✓ All tasks complete for today'
                  : `${percent}% complete`}
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// Animated SVG progress ring
function ProgressRing({ percent, size = 110 }: { percent: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        strokeWidth="8" fill="none"
        stroke="rgba(255,255,255,0.25)"
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        strokeWidth="8" fill="none"
        stroke="white"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { loading: capabilitiesLoading } = useCapabilities();
  const { t } = useTranslation();
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [allPracticeTasks, setAllPracticeTasks] = useState<SlimTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProcessDialog, setShowProcessDialog] = useState(false);

  const isManager = MANAGER_ROLES.has(user?.role ?? '');

  // Fetch personal tasks
  useEffect(() => {
    if (!user) return;
    supabase
      .from('tasks')
      .select('id, title, due_at, status, priority, module')
      .eq('assigned_to_user_id', user.id)
      .order('due_at', { ascending: true })
      .then(({ data }) => {
        setMyTasks(data || []);
        setLoading(false);
      });
  }, [user]);

  // Fetch all practice tasks for managers
  useEffect(() => {
    if (!user || !isManager || !user.practiceId) return;
    supabase
      .from('tasks')
      .select('id, due_at, status')
      .eq('practice_id', user.practiceId)
      .then(({ data }) => {
        setAllPracticeTasks(data || []);
      });
  }, [user, isManager]);

  // Cleaner / reception: show a dedicated welcome page instead of the
  // task-manager dashboard. Rendered early (before loading check) so
  // the cleaning data fetch runs independently.
  if (user && (user.role === 'reception' || user.role === 'cleaner')) {
    return <CleanerHome practiceId={user.practiceId} name={user.name} />;
  }

  if (loading || capabilitiesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  // ── Greeting ───────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? '';
  const roleLabel = AVAILABLE_ROLES.find(r => r.value === user?.role)?.label ?? user?.role ?? '';

  // ── Derived task stats ─────────────────────────────────────────────
  const now = new Date();
  const closed = (t: Task) => ['closed', 'submitted', 'complete'].includes(t.status);

  const todayTasks   = myTasks.filter(t => isToday(new Date(t.due_at)));
  const todayDone    = todayTasks.filter(closed);
  const overdue      = myTasks.filter(t => isPast(new Date(t.due_at)) && !closed(t));
  const dueThisWeek  = myTasks.filter(t => isThisWeek(new Date(t.due_at)) && !closed(t));
  const completedAll = myTasks.filter(closed);

  const progressPercent = todayTasks.length > 0
    ? Math.round((todayDone.length / todayTasks.length) * 100)
    : 0;

  // ── Practice-wide stats (managers only) ────────────────────────────
  const allClosed = (t: SlimTask) => ['closed', 'submitted', 'complete'].includes(t.status);
  const allOverdueCount = allPracticeTasks.filter(t => isPast(new Date(t.due_at)) && !allClosed(t)).length;
  const allDueTodayCount = allPracticeTasks.filter(t => isToday(new Date(t.due_at))).length;

  // ── Stat cards ─────────────────────────────────────────────────────
  const statCards = [
    {
      label: 'Pending Today',
      value: todayTasks.length - todayDone.length,
      Icon: Clock,
      bg: 'bg-blue-50 dark:bg-blue-950',
      iconColor: 'text-blue-500',
      urgent: false,
    },
    {
      label: 'Overdue',
      value: overdue.length,
      Icon: AlertTriangle,
      bg: 'bg-red-50 dark:bg-red-950',
      iconColor: 'text-red-500',
      urgent: overdue.length > 0,
    },
    {
      label: 'Done Today',
      value: todayDone.length,
      Icon: CheckCircle2,
      bg: 'bg-green-50 dark:bg-green-950',
      iconColor: 'text-green-500',
      urgent: false,
    },
    {
      label: 'Due This Week',
      value: dueThisWeek.length,
      Icon: Calendar,
      bg: 'bg-purple-50 dark:bg-purple-950',
      iconColor: 'text-purple-500',
      urgent: false,
    },
  ];

  // ── Quick actions (role-specific) ──────────────────────────────────
  type QuickAction = { label: string; path: string; Icon: React.ElementType };
  let quickActions: QuickAction[];

  if (isManager) {
    quickActions = [
      { label: 'Tasks', path: '/tasks', Icon: ListTodo },
      { label: 'Schedule', path: '/schedule', Icon: Calendar },
      { label: 'Users', path: '/user-management', Icon: Users },
      { label: 'Policies', path: '/policies', Icon: FileText },
      { label: 'Reports', path: '/reports', Icon: TrendingUp },
    ];
  } else if (user?.role === 'gp') {
    quickActions = [
      { label: 'My Tasks', path: '/tasks', Icon: ListTodo },
      { label: 'Schedule', path: '/schedule', Icon: Calendar },
      { label: 'Policies', path: '/policies', Icon: FileText },
      { label: 'Incidents', path: '/incidents', Icon: AlertTriangle },
    ];
  } else if (user?.role === 'nurse') {
    quickActions = [
      { label: 'My Tasks', path: '/tasks', Icon: ListTodo },
      { label: 'Fridge Temps', path: '/fridge-temps', Icon: Thermometer },
      { label: 'IPC Audit', path: '/ipc', Icon: Shield },
      { label: 'Policies', path: '/policies', Icon: FileText },
    ];
  } else {
    quickActions = [
      { label: 'My Tasks', path: '/tasks', Icon: ListTodo },
      { label: 'Fridge Temps', path: '/fridge-temps', Icon: Thermometer },
      { label: 'My Profile', path: '/staff-self-service', Icon: Users },
    ];
  }

  // ── Non-manager task tab data ──────────────────────────────────────
  const currentMonthTasks = myTasks.filter(
    t => isThisMonth(new Date(t.due_at)) && !closed(t)
  );

  const getStatusBadge = (task: Task) => {
    const dueDate = new Date(task.due_at);
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (isPast(dueDate) && !closed(task))
      return <Badge variant="destructive">Overdue</Badge>;
    if (daysUntilDue <= 2)
      return <Badge className="bg-orange-500 text-white">Due Soon</Badge>;
    return <Badge variant="secondary">On Track</Badge>;
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">

      {/* ── Manager header: clean white layout ── */}
      {isManager ? (
        <div className="space-y-4">
          {/* Greeting row */}
          <div>
            <p className="text-muted-foreground text-sm">{greeting},</p>
            <h1 className="text-2xl md:text-3xl font-bold">{firstName}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {user?.practice?.name && (
                <span className="text-sm text-muted-foreground">{user.practice.name}</span>
              )}
              <Badge className="bg-teal-100 text-teal-700 border border-teal-200 hover:bg-teal-100">
                {roleLabel}
              </Badge>
            </div>
          </div>

          {/* Practice-wide stat cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* ACTION REQUIRED card */}
            <Card className="bg-red-50 border-red-100">
              <CardContent className="p-4">
                <Badge className="bg-red-500 text-white text-xs mb-2">ACTION REQUIRED</Badge>
                <div className="text-3xl font-bold text-red-600">{allOverdueCount}</div>
                <p className="text-xs text-red-500 mt-1 leading-tight">Overdue practice tasks</p>
              </CardContent>
            </Card>

            {/* Due today card */}
            <Card className="bg-white border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Due Today</span>
                </div>
                <div className="text-3xl font-bold">{allDueTodayCount}</div>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">practice tasks today</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* ── Non-manager: gradient header with progress ring ── */
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-xl p-5 md:p-6 text-white shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-blue-200 text-sm font-medium">{greeting},</p>
              <h1 className="text-2xl md:text-3xl font-bold truncate">{firstName}!</h1>
              {user?.practice?.name && (
                <p className="text-blue-200 text-sm truncate">{user.practice.name}</p>
              )}
              <Badge className="mt-2 bg-white/20 text-white border border-white/30 hover:bg-white/30">
                {roleLabel}
              </Badge>
            </div>

            <div className="flex-shrink-0 flex flex-col items-center gap-1">
              <div className="relative">
                <ProgressRing percent={progressPercent} size={110} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold leading-none">{progressPercent}%</span>
                  <span className="text-xs text-blue-200 mt-0.5">today</span>
                </div>
              </div>
              <p className="text-xs text-blue-200">
                {todayDone.length}/{todayTasks.length} tasks done
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Personal stat cards (all roles) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map(card => (
          <Card
            key={card.label}
            className={card.urgent ? 'ring-2 ring-destructive/40' : ''}
          >
            <CardContent className="p-4">
              <div className={`inline-flex rounded-lg p-2 mb-3 ${card.bg}`}>
                <card.Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
              <div className={`text-2xl font-bold ${card.urgent ? 'text-destructive' : ''}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-tight">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Quick Actions
        </p>
        <div className="flex flex-wrap gap-2">
          {quickActions.map(action => (
            <Link key={action.path} to={action.path}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <action.Icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Manager-specific sections ── */}
      {isManager && (
        <>
          <ReadyForAudit />
          <PoliciesNeedingAcknowledgment />
          <div className="grid gap-6 md:grid-cols-2">
            <AITaskSuggestions />
            <PracticeScoresCard />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Process Mapping
              </CardTitle>
              <CardDescription>
                View and generate process diagrams for your practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowProcessDialog(true)}>Show Process</Button>
            </CardContent>
          </Card>
          {user?.practiceId && (
            <ShowProcessDialog
              open={showProcessDialog}
              onOpenChange={setShowProcessDialog}
              practiceId={user.practiceId}
            />
          )}
        </>
      )}

      {/* ── Standard user sections ── */}
      {!isManager && (
        <>
          <PoliciesNeedingAcknowledgment />

          <Tabs defaultValue="current">
            <TabsList>
              <TabsTrigger value="current">
                <Clock className="h-4 w-4 mr-1.5" />
                To Do ({currentMonthTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Completed ({completedAll.length})
              </TabsTrigger>
              <TabsTrigger value="overdue">
                <XCircle className="h-4 w-4 mr-1.5" />
                Overdue ({overdue.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-3 mt-4">
              {currentMonthTasks.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-muted-foreground text-sm">No tasks due this month</p>
                  </CardContent>
                </Card>
              ) : (
                currentMonthTasks.map(task => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(task.due_at), 'dd MMM yyyy')}
                            </span>
                            <Badge variant="outline" className="text-xs">{task.module}</Badge>
                          </div>
                        </div>
                        {getStatusBadge(task)}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-3 mt-4">
              {completedAll.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    No completed tasks yet
                  </CardContent>
                </Card>
              ) : (
                completedAll.map(task => (
                  <Card key={task.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(task.due_at), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">{task.module}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="overdue" className="space-y-3 mt-4">
              {overdue.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    No overdue tasks
                  </CardContent>
                </Card>
              ) : (
                overdue.map(task => (
                  <Card key={task.id} className="border-destructive/40">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {format(new Date(task.due_at), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <Badge variant="destructive" className="text-xs flex-shrink-0">Overdue</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
