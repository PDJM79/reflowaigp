import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Thermometer, AlertTriangle, CheckCircle, Plus, Trash2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { SectionScoreBadge } from '@/components/dashboard/SectionScoreBadge';

export default function FridgeTemps() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [logs, setLogs] = useState<any[]>([]);
  const [fridges, setFridges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFridge, setNewFridge] = useState({
    name: '',
    location: '',
    min_temp: '2',
    max_temp: '8'
  });

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

  const handleAddFridge = async () => {
    if (!newFridge.name.trim()) {
      toast.error('Please enter a fridge name');
      return;
    }

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return;

      const { error } = await supabase
        .from('fridges')
        .insert({
          practice_id: userData.practice_id,
          name: newFridge.name,
          location: newFridge.location,
          min_temp: parseFloat(newFridge.min_temp),
          max_temp: parseFloat(newFridge.max_temp)
        });

      if (error) throw error;

      toast.success('Fridge added successfully');
      setIsAddDialogOpen(false);
      setNewFridge({ name: '', location: '', min_temp: '2', max_temp: '8' });
      fetchData();
    } catch (error) {
      console.error('Error adding fridge:', error);
      toast.error('Failed to add fridge');
    }
  };

  const handleDeleteFridge = async (fridgeId: string, fridgeName: string) => {
    if (!confirm(`Are you sure you want to delete "${fridgeName}"? This will also delete all associated temperature logs.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('fridges')
        .delete()
        .eq('id', fridgeId);

      if (error) throw error;

      toast.success('Fridge deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting fridge:', error);
      toast.error('Failed to delete fridge');
    }
  };

  const breaches = logs.filter(l => l.breach_flag);
  const compliant = logs.filter(l => !l.breach_flag);

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Thermometer className="h-6 w-6 sm:h-8 sm:w-8" />
            Fridge Temperature Monitoring
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track vaccine and medication storage temperatures</p>
        </div>
        <Button 
          onClick={() => navigate('/tasks?module=fridge_temps')}
          size={isMobile ? 'lg' : 'default'}
          className="w-full sm:w-auto min-h-[44px]"
        >
          <Camera className="h-4 w-4 mr-2" />
          {isMobile ? 'Log Temp' : 'Log Temperature'}
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 sm:gap-4">
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Fridges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{fridges.length}</div>
          </CardContent>
        </Card>

        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Today's Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>

        <Card className="border-success touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 text-success">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">Compliant</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{compliant.length}</div>
          </CardContent>
        </Card>

        <Card className={`${breaches.length > 0 ? 'border-destructive' : ''} touch-manipulation`}>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 text-destructive">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">Breaches</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{breaches.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
            <CardTitle className="text-base sm:text-lg">Registered Fridges</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size={isMobile ? 'default' : 'sm'} className="w-full sm:w-auto min-h-[44px] sm:min-h-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fridge
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Fridge</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-base">Fridge Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Vaccine Fridge A"
                      value={newFridge.name}
                      onChange={(e) => setNewFridge({ ...newFridge, name: e.target.value })}
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-base">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Treatment Room 1"
                      value={newFridge.location}
                      onChange={(e) => setNewFridge({ ...newFridge, location: e.target.value })}
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min_temp" className="text-base">Min Temp (°C)</Label>
                      <Input
                        id="min_temp"
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={newFridge.min_temp}
                        onChange={(e) => setNewFridge({ ...newFridge, min_temp: e.target.value })}
                        className="h-11 text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_temp" className="text-base">Max Temp (°C)</Label>
                      <Input
                        id="max_temp"
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={newFridge.max_temp}
                        onChange={(e) => setNewFridge({ ...newFridge, max_temp: e.target.value })}
                        className="h-11 text-base"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                      className="w-full sm:w-auto min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddFridge}
                      className="w-full sm:w-auto min-h-[44px]"
                    >
                      Add Fridge
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {fridges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Thermometer className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No fridges registered</p>
                <p className="text-sm mt-2">Click "Add Fridge" to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {fridges.map((fridge) => (
                  <div key={fridge.id} className="flex items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-sm sm:text-base truncate">{fridge.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {fridge.location && `${fridge.location} • `}
                        Range: {fridge.min_temp}°C - {fridge.max_temp}°C
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteFridge(fridge.id, fridge.name)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px] min-w-[44px] flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Today's Temperature Logs</CardTitle>
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
                  <div 
                    key={log.id} 
                    className={`flex items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation ${
                      log.breach_flag ? 'border-destructive bg-destructive/5' : ''
                    }`}
                  >
                    <div className="min-w-0 mr-2">
                      <p className="font-medium text-sm sm:text-base truncate">{log.fridges?.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{log.log_time}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-lg sm:text-xl">{log.reading}°C</p>
                      {log.breach_flag && (
                        <p className="text-xs text-destructive font-semibold">BREACH</p>
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
