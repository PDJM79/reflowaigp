import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PoundSterling, Plus, Calendar, FileText, FileDown, Info } from 'lucide-react';
import { ScriptClaimRunDialog } from '@/components/scripts/ScriptClaimRunDialog';
import { toast } from 'sonner';

export default function Claims() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claimRuns, setClaimRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClaimRunDialogOpen, setIsClaimRunDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    setLoading(false);
  }, [user, navigate]);

  const draftClaims = claimRuns.filter(c => c.status === 'draft');
  const submittedClaims = claimRuns.filter(c => c.status === 'submitted');

  const handleRefresh = () => {
    toast.info('Claims data will be available soon.');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <PoundSterling className="h-8 w-8" />
              Enhanced Service Claims
            </h1>
          </div>
          <p className="text-muted-foreground">Manage NHS enhanced service claims and submissions</p>
        </div>
        <Button onClick={() => setIsClaimRunDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Claim Run
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Claim Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{claimRuns.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Draft Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{draftClaims.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{submittedClaims.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Current Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2 font-medium">Enhanced service claims data will be available soon.</p>
          <p className="text-sm text-muted-foreground">
            This feature is being migrated to the new system. Claim runs and submissions will be restored shortly.
          </p>
        </CardContent>
      </Card>

      <ScriptClaimRunDialog
        open={isClaimRunDialogOpen}
        onOpenChange={setIsClaimRunDialogOpen}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
