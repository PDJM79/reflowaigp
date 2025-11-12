import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { IPCCheckDialog } from "@/components/ipc/IPCCheckDialog";
import { IPCActionDialog } from "@/components/ipc/IPCActionDialog";
import { generateIPCStatementPDF } from "@/lib/pdfExportV2";

export default function IPCAuditDetail() {
  const { auditId } = useParams<{ auditId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<any>(null);
  const [checks, setChecks] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [isCheckDialogOpen, setIsCheckDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [practiceId, setPracticeId] = useState<string>('');
  const [practiceName, setPracticeName] = useState<string>('');

  useEffect(() => {
    fetchAuditDetails();
  }, [auditId]);

  const fetchAuditDetails = async () => {
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
      setPracticeId(userData.practice_id);

      // Get practice name
      const { data: practiceData } = await supabase
        .from('practices')
        .select('name')
        .eq('id', userData.practice_id)
        .single();
      
      if (practiceData) setPracticeName(practiceData.name);

      // Fetch audit
      const { data: auditData, error: auditError } = await supabase
        .from('ipc_audits')
        .select('*')
        .eq('id', auditId)
        .single();

      if (auditError) throw auditError;
      setAudit(auditData);

      // Fetch checks
      const { data: checksData, error: checksError } = await supabase
        .from('ipc_checks')
        .select('*')
        .eq('audit_id', auditId)
        .order('section', { ascending: true });

      if (checksError) throw checksError;
      setChecks(checksData || []);

      // Fetch actions
      const { data: actionsData, error: actionsError } = await supabase
        .from('ipc_actions')
        .select('*')
        .eq('audit_id', auditId)
        .order('severity', { ascending: false });

      if (actionsError) throw actionsError;
      setActions(actionsData || []);
    } catch (error: any) {
      console.error('Error fetching audit details:', error);
      toast.error('Failed to load audit details');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAudit = async () => {
    try {
      const { error } = await supabase
        .from('ipc_audits')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', auditId);

      if (error) throw error;

      toast.success('Audit marked as complete');
      fetchAuditDetails();
    } catch (error: any) {
      console.error('Error completing audit:', error);
      toast.error('Failed to complete audit');
    }
  };

  const handleExportPDF = () => {
    if (!audit) return;

    const period = `${audit.period_month === 5 ? 'May' : 'December'} ${audit.period_year}`;
    const completionRate = checks.length > 0 
      ? Math.round((checks.filter((c: any) => c.response === 'yes').length / checks.length) * 100)
      : 0;

    const exporter = generateIPCStatementPDF({
      practiceName,
      period,
      audits: [audit],
      actions,
      completionRate
    });

    exporter.save(`IPC_Statement_${period.replace(' ', '_')}.pdf`);
    toast.success('PDF exported successfully');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading audit details...</p>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="container mx-auto p-6">
        <p>Audit not found</p>
      </div>
    );
  }

  const openActions = actions.filter((a: any) => a.status === 'open');
  const completedChecks = checks.filter((c: any) => c.response === 'yes').length;
  const failedChecks = checks.filter((c: any) => c.response === 'no').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ipc')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              IPC Audit - {audit.period_month === 5 ? 'May' : 'December'} {audit.period_year}
            </h1>
            <p className="text-muted-foreground">
              {audit.location_scope} • {audit.completed_at ? 'Completed' : 'In Progress'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!audit.completed_at && (
            <Button onClick={handleCompleteAudit}>
              Complete Audit
            </Button>
          )}
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{checks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{completedChecks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{failedChecks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openActions.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checks" className="w-full">
        <TabsList>
          <TabsTrigger value="checks">Checks</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="checks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>IPC Checks</CardTitle>
              <Button size="sm" onClick={() => setIsCheckDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Check
              </Button>
            </CardHeader>
            <CardContent>
              {checks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No checks recorded</p>
              ) : (
                <div className="space-y-3">
                  {checks.map((check: any) => (
                    <div key={check.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={
                              check.response === 'yes' ? 'default' :
                              check.response === 'no' ? 'destructive' : 'secondary'
                            }>
                              {check.response}
                            </Badge>
                            <span className="font-medium capitalize">{check.section.replace('_', ' ')}</span>
                          </div>
                          {check.area && (
                            <p className="text-sm text-muted-foreground mb-1">Area: {check.area}</p>
                          )}
                          <p className="text-sm">{check.item}</p>
                          {check.comments && (
                            <p className="text-sm text-muted-foreground mt-2">{check.comments}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Action Plans</CardTitle>
              <Button size="sm" onClick={() => setIsActionDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No actions created</p>
              ) : (
                <div className="space-y-3">
                  {actions.map((action: any) => (
                    <div key={action.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={
                              action.severity === 'urgent' ? 'destructive' :
                              action.severity === 'moderate' ? 'default' : 'secondary'
                            }>
                              {action.severity}
                            </Badge>
                            <Badge variant="outline">{action.status}</Badge>
                          </div>
                          <p className="font-medium">{action.action_description}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Due: {new Date(action.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <IPCCheckDialog
        open={isCheckDialogOpen}
        onClose={() => {
          setIsCheckDialogOpen(false);
          fetchAuditDetails();
        }}
        auditId={auditId!}
        practiceId={practiceId}
      />
      <IPCActionDialog
        open={isActionDialogOpen}
        onClose={() => {
          setIsActionDialogOpen(false);
          fetchAuditDetails();
        }}
        auditId={auditId!}
        practiceId={practiceId}
      />
    </div>
  );
}
