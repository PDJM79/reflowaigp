import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pill, Plus, XCircle, FileText, Info } from 'lucide-react';
import { ScriptEntryDialog } from '@/components/scripts/ScriptEntryDialog';
import { ScriptRemovalDialog } from '@/components/scripts/ScriptRemovalDialog';
import { ClaimRunDialog } from '@/components/scripts/ClaimRunDialog';
import { toast } from 'sonner';

export default function MonthEndScripts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [removalDialogOpen, setRemovalDialogOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    setLoading(false);
  }, [user, navigate]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const activeScripts = scripts.filter(s => !s.removed && s.month?.startsWith(currentMonth));
  const removedScripts = scripts.filter(s => s.removed);

  const handleRemoveClick = (script: any) => {
    setSelectedScript(script);
    setRemovalDialogOpen(true);
  };

  const handleCreateClaim = () => {
    setClaimDialogOpen(true);
  };

  const handleRefresh = () => {
    toast.info('Month-end scripts data will be available soon.');
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
        <Button onClick={() => setEntryDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Script
        </Button>
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

      <Card>
        <CardContent className="py-12 text-center">
          <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2 font-medium">Month-end scripts data will be available soon.</p>
          <p className="text-sm text-muted-foreground">
            This feature is being migrated to the new system. Script recording and claim runs will be restored shortly.
          </p>
        </CardContent>
      </Card>

      <ScriptEntryDialog
        isOpen={entryDialogOpen}
        onClose={() => setEntryDialogOpen(false)}
        onSuccess={handleRefresh}
      />

      <ScriptRemovalDialog
        isOpen={removalDialogOpen}
        onClose={() => {
          setRemovalDialogOpen(false);
          setSelectedScript(null);
        }}
        onSuccess={handleRefresh}
        script={selectedScript}
      />

      <ClaimRunDialog
        isOpen={claimDialogOpen}
        onClose={() => setClaimDialogOpen(false)}
        onSuccess={handleRefresh}
        selectedMonth={currentMonth}
        scripts={activeScripts}
      />
    </div>
  );
}
