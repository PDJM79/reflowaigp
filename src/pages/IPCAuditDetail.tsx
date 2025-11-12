import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { IPCActionDialog } from "@/components/ipc/IPCActionDialog";

export default function IPCAuditDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<any>(null);
  const [checks, setChecks] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [showActionDialog, setShowActionDialog] = useState(false);

  useEffect(() => {
    if (id) fetchAuditData();
  }, [id]);

  const fetchAuditData = async () => {
    try {
      // Fetch audit
      const { data: auditData, error: auditError } = await supabase
        .from('ipc_audits')
        .select('*')
        .eq('id', id)
        .single();

      if (auditError) throw auditError;

      // Fetch checks
      const { data: checksData, error: checksError } = await supabase
        .from('ipc_checks')
        .select('*')
        .eq('audit_id', id)
        .order('created_at', { ascending: true });

      if (checksError) throw checksError;

      // Fetch actions
      const { data: actionsData, error: actionsError } = await supabase
        .from('ipc_actions')
        .select('*')
        .eq('audit_id', id)
        .order('due_date', { ascending: true });

      if (actionsError) throw actionsError;

      setAudit(auditData);
      setChecks(checksData || []);
      setActions(actionsData || []);
    } catch (error: any) {
      console.error('Error fetching audit data:', error);
      toast.error('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAudit = async () => {
    try {
      const { error } = await supabase
        .from('ipc_audits')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Audit marked as completed');
      fetchAuditData();
    } catch (error: any) {
      console.error('Error completing audit:', error);
      toast.error(error.message || 'Failed to complete audit');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading audit data...</p>
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

  const monthName = new Date(audit.period_year, audit.period_month - 1).toLocaleDateString('en-GB', { month: 'long' });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ipc')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {monthName} {audit.period_year} IPC Audit
          </h1>
          <p className="text-muted-foreground mt-1">
            Status: {audit.status.replace('_', ' ')} • {audit.location_scope.replace('_', ' ')}
          </p>
        </div>
        {audit.status !== 'completed' && (
          <Button onClick={handleCompleteAudit}>
            Mark as Complete
          </Button>
        )}
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              {checks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No checks recorded yet. Start the audit to add checks.
                </p>
              ) : (
                <div className="space-y-4">
                  {checks.map((check) => (
                    <div key={check.id} className="border-b pb-3 last:border-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{check.section}</p>
                          <p className="text-sm text-muted-foreground">{check.area}</p>
                          <p className="text-sm mt-1">{check.item}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          check.response === 'yes' ? 'bg-green-100 text-green-800' :
                          check.response === 'no' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {check.response.toUpperCase()}
                        </span>
                      </div>
                      {check.comments && (
                        <p className="text-sm text-muted-foreground mt-2">{check.comments}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Action Plan</CardTitle>
              <Button size="sm" onClick={() => setShowActionDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4 text-sm">
                  No actions yet
                </p>
              ) : (
                <div className="space-y-3">
                  {actions.map((action) => (
                    <div key={action.id} className="border-b pb-3 last:border-0">
                      <p className="text-sm font-medium">{action.action_description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          action.severity === 'urgent' ? 'bg-red-100 text-red-800' :
                          action.severity === 'short_term' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {action.severity.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {action.timeframe.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <IPCActionDialog
        isOpen={showActionDialog}
        onClose={() => setShowActionDialog(false)}
        auditId={id!}
        onSuccess={fetchAuditData}
      />
    </div>
  );
}
