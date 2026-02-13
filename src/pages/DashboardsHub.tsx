import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Activity, Users, Building2, MessageSquare, BarChart3, Stamp } from 'lucide-react';

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
