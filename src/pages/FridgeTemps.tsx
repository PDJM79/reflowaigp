import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function FridgeTemps() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [fridges, setFridges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;

      const [fridgesData, logsData] = await Promise.all([
        supabase
          .from('fridges')
          .select('*')
          .eq('practice_id', userData.practice_id),
        supabase
          .from('temp_logs')
          .select('*, fridges(name)')
          .eq('log_date', new Date().toISOString().split('T')[0])
          .order('log_time', { ascending: false })
      ]);

      setFridges(fridgesData.data || []);
      setLogs(logsData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load temperature data');
    } finally {
      setLoading(false);
    }
  };

  const breaches = logs.filter(l => l.breach_flag);
  const compliant = logs.filter(l => !l.breach_flag);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Thermometer className="h-8 w-8" />
            Fridge Temperature Monitoring
          </h1>
          <p className="text-muted-foreground">Track vaccine and medication storage temperatures</p>
        </div>
        <Button onClick={() => navigate('/tasks?module=fridge_temps')}>
          <Plus className="h-4 w-4 mr-2" />
          Log Temperature
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Fridges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fridges.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today's Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>

        <Card className="border-success">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-success">
              <CheckCircle className="h-4 w-4" />
              Compliant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{compliant.length}</div>
          </CardContent>
        </Card>

        <Card className={breaches.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Breaches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{breaches.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registered Fridges</CardTitle>
          </CardHeader>
          <CardContent>
            {fridges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No fridges registered</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fridges.map((fridge) => (
                  <div key={fridge.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{fridge.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Range: {fridge.min_temp}°C - {fridge.max_temp}°C
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Temperature Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Thermometer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No temperature logs for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <div key={log.id} className={`flex items-center justify-between p-3 border rounded-lg ${log.breach_flag ? 'border-destructive bg-destructive/5' : ''}`}>
                    <div>
                      <p className="font-medium">{log.fridges?.name}</p>
                      <p className="text-sm text-muted-foreground">{log.log_time}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{log.reading}°C</p>
                      {log.breach_flag && (
                        <p className="text-xs text-destructive">BREACH</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
