import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Activity, Users, Building2, MessageSquare, BarChart3, Stamp, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';

function HeadlineKPIs({ practiceId }: { practiceId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboards-headline', practiceId],
    queryFn: async () => {
      const [c, o] = await Promise.all([
        fetch(`/api/practices/${practiceId}/analytics/compliance`, { credentials: 'include' }),
        fetch(`/api/practices/${practiceId}/analytics/overdue-summary`, { credentials: 'include' }),
      ]);
      if (!c.ok || !o.ok) throw new Error('Failed to load headline KPIs');
      return { compliance: await c.json(), overdue: await o.json() };
    },
    enabled: !!practiceId,
  });

  if (isLoading) return <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading headline metrics…</div>;
  if (isError || !data) return <div className="text-sm text-muted-foreground">Headline metrics unavailable.</div>;

  const c = data.compliance;
  const fmt = (v: number | null) => (v == null ? '—' : `${v}%`);
  const kpis = [
    { label: 'Compliance (30d)', value: fmt(c.compliance_score), icon: TrendingUp, tone: 'text-primary' },
    { label: 'Fit for Audit', value: fmt(c.fit_for_audit_score), icon: Shield, tone: 'text-success' },
    { label: 'Overdue', value: String(data.overdue.overdue_open), icon: AlertTriangle, tone: 'text-destructive' },
    { label: 'Missed', value: String(data.overdue.missed), icon: AlertTriangle, tone: 'text-warning' },
  ];
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <Card key={k.label}>
            <CardContent className="py-4 flex items-center gap-3">
              <Icon className={`h-6 w-6 ${k.tone}`} />
              <div>
                <div className="text-2xl font-bold">{k.value}</div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function DashboardsHub() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  const dashboards = [
    {
      title: 'Compliance Overview',
      description: 'Regulatory readiness with compliance tracking and inspection preparation',
      icon: Shield,
      path: '/dashboards/compliance',
      color: 'text-primary',
    },
    {
      title: 'Clinical Governance',
      description: 'Patient safety monitoring, incidents trends, claims status, IPC audits, and medical requests',
      icon: Activity,
      path: '/dashboards/clinical',
      color: 'text-success',
    },
    {
      title: 'Workforce Management',
      description: 'DBS tracking, training certificates, appraisals schedule, and HR action plans',
      icon: Users,
      path: '/dashboards/workforce',
      color: 'text-warning',
    },
    {
      title: 'Environmental Safety',
      description: 'Cleaning compliance, fire/H&S assessments, fridge monitoring, COSHH/Legionella',
      icon: Building2,
      path: '/dashboards/environmental',
      color: 'text-info',
    },
    {
      title: 'Patient Experience',
      description: 'Complaints analysis, SLA compliance, AI theme detection, sentiment tracking',
      icon: MessageSquare,
      path: '/dashboards/patient-experience',
      color: 'text-destructive',
    },
    {
      title: 'Governance Approvals',
      description: 'Formal sign-off tracking, bulk approvals, and regulatory audit trail',
      icon: Stamp,
      path: '/dashboards/governance',
      color: 'text-info',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Specialised Dashboards
        </h1>
        <p className="text-muted-foreground">
          Comprehensive analytics and inspection-ready reporting across all compliance areas
        </p>
      </div>

      {user?.practiceId && <HeadlineKPIs practiceId={user.practiceId} />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((dashboard) => {
          const Icon = dashboard.icon;
          return (
            <Link key={dashboard.path} to={dashboard.path}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Icon className={`h-8 w-8 ${dashboard.color}`} />
                    <span>{dashboard.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{dashboard.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="py-6">
          <div className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-primary mt-1" />
            <div>
              <p className="font-medium mb-1">All dashboards support PDF export</p>
              <p className="text-sm text-muted-foreground">
                Generate inspection-ready evidence packs with comprehensive data, charts, and compliance indicators. 
                Each dashboard is designed to meet regulatory inspection requirements with clear RAG status indicators 
                and regulatory framework mapping.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
