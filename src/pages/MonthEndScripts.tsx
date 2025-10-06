import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill, Calendar, Upload, Download } from 'lucide-react';

export default function MonthEndScripts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchScripts();
  }, [user, navigate]);

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
        .limit(50);

      if (error) throw error;
      setScripts(data || []);
    } catch (error) {
      console.error('Error fetching scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthScripts = scripts.filter(s => s.month.startsWith(currentMonth));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Pill className="h-8 w-8" />
            Month-End Scripts
          </h1>
          <p className="text-muted-foreground">Track prescriptions and controlled drugs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import from EMIS
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentMonthScripts.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Scripts recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {currentMonthScripts.reduce((sum, s) => sum + parseFloat(s.quantity || 0), 0).toFixed(0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Units issued</p>
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

      {loading ? (
        <div className="text-center py-8">Loading scripts data...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Scripts</CardTitle>
          </CardHeader>
          <CardContent>
            {scripts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No month-end scripts recorded yet</p>
                <p className="text-sm mt-2">Import data from EMIS to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scripts.slice(0, 10).map((script) => (
                  <div key={script.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{script.drug_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {script.prescriber} • {new Date(script.issue_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Qty: {script.quantity}</p>
                      <p className="text-xs text-muted-foreground">{script.drug_code}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
