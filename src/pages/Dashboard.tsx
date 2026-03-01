import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, AlertTriangle, Clock, Calendar,
  ListTodo, Thermometer, Shield, FileText, Users,
  TrendingUp, XCircle, GitBranch,
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

const MANAGER_ROLES = new Set([
  'practice_manager', 'administrator', 'nurse_lead',
  'cd_lead_gp', 'ig_lead', 'estates_lead', 'reception_lead', 'auditor',
]);

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
  const [loading, setLoading] = useState(true);
  const [showProcessDialog, setShowProcessDialog] = useState(false);

  const isManager = MANAGER_ROLES.has(user?.role ?? '');

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

  // Redirect cleaners/reception
  if (user && (user.role === 'reception' || user.role === 'cleaner')) {
    return <Navigate to="/cleaning" replace />;
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
  const closed = (t: Task) => ['closed', 'submitted'].includes(t.status);

  const todayTasks   = myTasks.filter(t => isToday(new Date(t.due_at)));
  const todayDone    = todayTasks.filter(closed);
  const overdue      = myTasks.filter(t => isPast(new Date(t.due_at)) && !closed(t));
  const dueThisWeek  = myTasks.filter(t => isThisWeek(new Date(t.due_at)) && !closed(t));
  const completedAll = myTasks.filter(closed);

  const progressPercent = todayTasks.length > 0
    ? Math.round((todayDone.length / todayTasks.length) * 100)
    : 100;

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

      {/* ── Personalised gradient header ── */}
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

      {/* ── Stat cards ── */}
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
