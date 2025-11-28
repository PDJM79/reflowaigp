import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pill, Plus, XCircle, FileText } from 'lucide-react';
import { ScriptEntryDialog } from '@/components/scripts/ScriptEntryDialog';
import { ScriptRemovalDialog } from '@/components/scripts/ScriptRemovalDialog';
import { ClaimRunDialog } from '@/components/scripts/ClaimRunDialog';

export default function MonthEndScripts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [removalDialogOpen, setRemovalDialogOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchScripts();
    fetchUserRoles();
  }, [user, navigate]);

  const fetchUserRoles = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('user_roles(role)')
        .eq('auth_user_id', user?.id)
        .single();

      if (userData?.user_roles) {
        const roles = Array.isArray(userData.user_roles) 
          ? userData.user_roles.map((r: any) => r.role)
          : [(userData.user_roles as any).role];
        setUserRoles(roles);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const fetchScripts = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;

      const { data, error } = await supabase
        .from('month_end_scripts')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .order('month', { ascending: false })
        .order('issue_date', { ascending: false })
        .limit(200);

      if (error) throw error;
      setScripts(data || []);
    } catch (error) {
      console.error('Error fetching scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const activeScripts = scripts.filter(s => !s.removed && s.month.startsWith(currentMonth));
  const removedScripts = scripts.filter(s => s.removed);

  const canAdd = userRoles.some(r => ['nurse', 'nurse_lead', 'hca', 'practice_manager'].includes(r));
  const canRemove = userRoles.includes('practice_manager');

  const handleRemoveClick = (script: any) => {
    setSelectedScript(script);
    setRemovalDialogOpen(true);
  };

  const handleCreateClaim = () => {
    setClaimDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Pill className="h-8 w-8" />
              Month-End Scripts
            </h1>
          </div>
          <p className="text-muted-foreground">Track prescriptions and controlled drugs</p>
        </div>
        {canAdd && (
          <Button onClick={() => setEntryDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Script
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeScripts.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Scripts recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {activeScripts.reduce((sum, s) => sum + parseFloat(s.quantity || 0), 0).toFixed(0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Units issued</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Removed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{removedScripts.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Audit trail</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">All Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scripts.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Total entries</p>
          </CardContent>
        </Card>
      </div>

      {canRemove && activeScripts.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleCreateClaim}>
            <FileText className="h-4 w-4 mr-2" />
            Create Claim Run
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading scripts data...</div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">
              Active Scripts ({activeScripts.length})
            </TabsTrigger>
            <TabsTrigger value="removed">
              Removed Scripts ({removedScripts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Current Month Scripts</CardTitle>
              </CardHeader>
              <CardContent>
                {activeScripts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No scripts recorded for this month</p>
                    {canAdd && (
                      <p className="text-sm mt-2">Click "Add Script" to get started</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeScripts.map((script) => (
                      <div key={script.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{script.drug_name}</p>
                            <Badge variant="outline">{script.drug_code}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {script.prescriber} • {new Date(script.issue_date).toLocaleDateString()} • Qty: {script.quantity}
                          </p>
                          {script.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{script.notes}</p>
                          )}
                        </div>
                        {canRemove && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveClick(script)}
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="removed" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Removed Scripts (Audit Trail)</CardTitle>
              </CardHeader>
              <CardContent>
                {removedScripts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No removed scripts</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {removedScripts.map((script) => (
                      <div key={script.id} className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{script.drug_name}</p>
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                Removed
                              </Badge>
                              <Badge variant="outline">{script.drug_code}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {script.prescriber} • {new Date(script.issue_date).toLocaleDateString()} • Qty: {script.quantity}
                            </p>
                            {script.removed_reason && (
                              <div className="mt-2 p-2 bg-white rounded border border-orange-200">
                                <p className="text-xs font-medium text-orange-800">Removal Reason:</p>
                                <p className="text-xs text-orange-700">{script.removed_reason}</p>
                                {script.removed_at && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Removed: {new Date(script.removed_at).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
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
        </Tabs>
      )}

      <ScriptEntryDialog
        isOpen={entryDialogOpen}
        onClose={() => setEntryDialogOpen(false)}
        onSuccess={fetchScripts}
      />

      <ScriptRemovalDialog
        isOpen={removalDialogOpen}
        onClose={() => {
          setRemovalDialogOpen(false);
          setSelectedScript(null);
        }}
        onSuccess={fetchScripts}
        script={selectedScript}
      />

      <ClaimRunDialog
        isOpen={claimDialogOpen}
        onClose={() => setClaimDialogOpen(false)}
        onSuccess={fetchScripts}
        selectedMonth={currentMonth}
        scripts={activeScripts}
      />
    </div>
  );
}
