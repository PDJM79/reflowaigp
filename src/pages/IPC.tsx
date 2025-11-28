import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { IPCAuditCard } from "@/components/ipc/IPCAuditCard";
import { generateIPCStatementPDF } from "@/lib/pdfExportV2";

export default function IPC() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    openActions: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      // Fetch audits
      const { data: auditsData, error: auditsError } = await supabase
        .from('ipc_audits')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      if (auditsError) throw auditsError;

      // Fetch actions for stats
      const { data: actionsData, error: actionsError } = await supabase
        .from('ipc_actions')
        .select('status')
        .eq('practice_id', userData.practice_id);

      if (actionsError) throw actionsError;

      setAudits(auditsData || []);
      setStats({
        total: auditsData?.length || 0,
        completed: auditsData?.filter(a => a.completed_at !== null).length || 0,
        pending: auditsData?.filter(a => a.completed_at === null).length || 0,
        openActions: actionsData?.filter(a => a.status === 'open').length || 0
      });
    } catch (error: any) {
      console.error('Error fetching IPC data:', error);
      toast.error('Failed to load IPC data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAudit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      
      // IPC audits are May (5) or December (12) only
      const nextAuditMonth = currentMonth <= 5 ? 5 : 12;
      const nextAuditYear = currentMonth > 12 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
      
      const { data, error} = await supabase
        .from('ipc_audits')
        .insert([{
          practice_id: userData.practice_id,
          period_month: nextAuditMonth,
          period_year: nextAuditYear,
          location_scope: 'whole_practice'
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('IPC audit created successfully');
      navigate(`/ipc/audit/${data.id}`);
    } catch (error: any) {
      console.error('Error creating audit:', error);
      toast.error(error.message || 'Failed to create audit');
    }
  };

  const handleExportIPCStatement = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      const { data: practiceData } = await supabase
        .from('practices')
        .select('name')
        .eq('id', userData.practice_id)
        .single();

      const completedAudits = audits.filter(a => a.completed_at !== null);
      const { data: actionsData } = await supabase
        .from('ipc_actions')
        .select('*')
        .eq('practice_id', userData.practice_id);

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const period = `${oneYearAgo.toLocaleDateString()} to ${new Date().toLocaleDateString()}`;

      const exporter = generateIPCStatementPDF({
        practiceName: practiceData?.name || 'Practice',
        period,
        audits: completedAudits,
        actions: actionsData || [],
        completionRate: completedAudits.length > 0 ? Math.round((completedAudits.length / audits.length) * 100) : 0
      });

      exporter.save(`IPC_Statement_12_Month_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('IPC Statement PDF exported successfully');
    } catch (error: any) {
      console.error('Error exporting IPC statement:', error);
      toast.error('Failed to export IPC statement');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading IPC data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-3xl font-bold">Infection Prevention & Control</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Six-monthly IPC audits with 12-month retention (May & December)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportIPCStatement}>
            <Download className="h-4 w-4 mr-2" />
            Export IPC Statement
          </Button>
          <Button onClick={handleCreateAudit}>
            <Plus className="h-4 w-4 mr-2" />
            New Audit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Audits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.completed}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold">{stats.openActions}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Audits</h2>
        {audits.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No IPC audits yet. Create your first audit to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {audits.map((audit) => (
              <IPCAuditCard
                key={audit.id}
                audit={audit}
                onView={(id) => navigate(`/ipc/audits/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
