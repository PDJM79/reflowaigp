import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Thermometer, AlertTriangle, CheckCircle, Plus, Trash2, Camera, Loader2, RefreshCw, FileText, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { triggerHaptic } from '@/lib/haptics';
import { generateFridgeTempReportPDF } from '@/lib/pdfExportV2';

// Import fridge components
import { EditFridgeDialog } from '@/components/fridge/EditFridgeDialog';
import { RemedialActionDialog } from '@/components/fridge/RemedialActionDialog';
import { FridgeComplianceChart } from '@/components/fridge/FridgeComplianceChart';
import { HistoricalLogView } from '@/components/fridge/HistoricalLogView';
import type { Fridge, TempLogWithFridge, DailyComplianceStats } from '@/components/fridge/types';

export default function FridgeTemps() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // State
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [practiceName, setPracticeName] = useState<string>('');
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [todayLogs, setTodayLogs] = useState<TempLogWithFridge[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<DailyComplianceStats[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [editingFridge, setEditingFridge] = useState<Fridge | null>(null);
  const [selectedBreachLog, setSelectedBreachLog] = useState<TempLogWithFridge | null>(null);
  
  // Form states
  const [newFridge, setNewFridge] = useState({
    name: '',
    location: '',
    min_temp: '2',
    max_temp: '8'
  });
  const [newLog, setNewLog] = useState({
    fridge_id: '',
    reading: '',
    log_time: 'AM' as 'AM' | 'PM'
  });

  const { scrollableRef, isPulling, pullProgress, isRefreshing } = usePullToRefresh({
    onRefresh: async () => {
      await fetchData();
      triggerHaptic('success');
    },
    enabled: isMobile,
  });

  const fetchData = useCallback(async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id, practices(name)')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData?.practice_id) return;
      
      setPracticeId(userData.practice_id);
      setPracticeName((userData as any).practices?.name || '');

      const today = new Date().toISOString().split('T')[0];
      
      const [fridgesData, logsData] = await Promise.all([
        supabase
          .from('fridges')
          .select('*')
          .eq('practice_id', userData.practice_id),
        supabase
          .from('temp_logs')
          .select('*, fridges(name, min_temp, max_temp)')
          .eq('log_date', today)
          .order('created_at', { ascending: false })
      ]);

      setFridges(fridgesData.data || []);
      setTodayLogs((logsData.data as TempLogWithFridge[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load temperature data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate, fetchData]);

  const handleAddFridge = async () => {
    if (!newFridge.name.trim()) {
      toast.error('Please enter a fridge name');
      return;
    }

    if (!practiceId) {
      toast.error('Unable to determine practice. Please refresh and try again.');
      return;
    }

    const minTemp = parseFloat(newFridge.min_temp);
    const maxTemp = parseFloat(newFridge.max_temp);

    if (isNaN(minTemp) || isNaN(maxTemp)) {
      toast.error('Please enter valid temperature values');
      return;
    }

    if (minTemp >= maxTemp) {
      toast.error('Minimum temperature must be less than maximum');
      return;
    }

    try {
      const { error } = await supabase
        .from('fridges')
        .insert({
          practice_id: practiceId,
          name: newFridge.name.trim(),
          location: newFridge.location.trim() || null,
          min_temp: minTemp,
          max_temp: maxTemp
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast.success('Fridge added successfully');
      setIsAddDialogOpen(false);
      setNewFridge({ name: '', location: '', min_temp: '2', max_temp: '8' });
      fetchData();
    } catch (error: any) {
      console.error('Error adding fridge:', error);
      if (error?.code === '42501' || error?.message?.includes('policy')) {
        toast.error('You don\'t have permission to add fridges. Contact your practice manager.');
      } else {
        toast.error(error?.message || 'Failed to add fridge');
      }
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

  const handleLogTemperature = async () => {
    if (!newLog.fridge_id) {
      toast.error('Please select a fridge');
      return;
    }
    if (!newLog.reading) {
      toast.error('Please enter a temperature reading');
      return;
    }

    const reading = parseFloat(newLog.reading);
    if (isNaN(reading)) {
      toast.error('Please enter a valid temperature');
      return;
    }

    try {
      const selectedFridge = fridges.find(f => f.id === newLog.fridge_id);
      const breachFlag = selectedFridge 
        ? (reading < selectedFridge.min_temp || reading > selectedFridge.max_temp) 
        : false;

      const { error } = await supabase
        .from('temp_logs')
        .insert({
          fridge_id: newLog.fridge_id,
          reading: reading,
          log_date: new Date().toISOString().split('T')[0],
          log_time: newLog.log_time,
          breach_flag: breachFlag,
          recorded_by: user?.id || ''
        });

      if (error) throw error;

      if (breachFlag) {
        toast.error('Temperature logged - BREACH DETECTED! Please record remedial action.', {
          duration: 5000
        });
      } else {
        toast.success('Temperature logged successfully');
      }
      
      setIsLogDialogOpen(false);
      setNewLog({ fridge_id: '', reading: '', log_time: 'AM' });
      fetchData();
    } catch (error) {
      console.error('Error logging temperature:', error);
      toast.error('Failed to log temperature');
    }
  };

  const handleExportPDF = async () => {
    if (!practiceId) return;

    try {
      // Fetch all logs for the last 30 days
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data: allLogs } = await supabase
        .from('temp_logs')
        .select('*')
        .gte('log_date', thirtyDaysAgo)
        .lte('log_date', today)
        .order('log_date', { ascending: false });

      const logs = allLogs || [];
      const breaches = logs.filter(l => l.breach_flag).length;
      const complianceRate = logs.length > 0 
        ? ((logs.length - breaches) / logs.length) * 100 
        : 100;

      const exporter = generateFridgeTempReportPDF({
        practiceName: practiceName || 'Practice',
        period: `${format(subDays(new Date(), 30), 'dd MMM yyyy')} - ${format(new Date(), 'dd MMM yyyy')}`,
        fridges: fridges,
        logs: logs,
        stats: {
          totalLogs: logs.length,
          breaches,
          complianceRate
        }
      });

      exporter.save(`Fridge_Temperature_Report_${today}.pdf`);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export report');
    }
  };

  const breaches = todayLogs.filter(l => l.breach_flag);
  const compliant = todayLogs.filter(l => !l.breach_flag);

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div ref={scrollableRef} className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
      {/* Pull to Refresh Indicator */}
      {isMobile && (isPulling || isRefreshing) && (
        <div 
          className="flex items-center justify-center py-4 transition-opacity"
          style={{ opacity: isPulling ? pullProgress : 1 }}
        >
          {isRefreshing ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <RefreshCw 
              className="h-6 w-6 text-primary transition-transform"
              style={{ transform: `rotate(${pullProgress * 360}deg)` }}
            />
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <BackButton />
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Thermometer className="h-6 w-6 sm:h-8 sm:w-8" />
              Fridge Temperature Monitoring
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track vaccine and medication storage temperatures
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            onClick={handleExportPDF}
            size={isMobile ? 'lg' : 'default'}
            className="flex-1 sm:flex-none min-h-[44px]"
            disabled={fridges.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button 
            onClick={() => setIsLogDialogOpen(true)}
            size={isMobile ? 'lg' : 'default'}
            className="flex-1 sm:flex-none min-h-[44px]"
            disabled={fridges.length === 0}
          >
            <Camera className="h-4 w-4 mr-2" />
            {isMobile ? 'Log Temp' : 'Log Temperature'}
          </Button>
        </div>
      </div>

      {/* Log Temperature Dialog */}
      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Temperature Reading</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="fridge_select" className="text-base">Select Fridge *</Label>
              <Select
                value={newLog.fridge_id}
                onValueChange={(value) => setNewLog({ ...newLog, fridge_id: value })}
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue placeholder="Select a fridge" />
                </SelectTrigger>
                <SelectContent>
                  {fridges.map((fridge) => (
                    <SelectItem key={fridge.id} value={fridge.id}>
                      {fridge.name} ({fridge.min_temp}°C - {fridge.max_temp}°C)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reading" className="text-base">Temperature (°C) *</Label>
              <Input
                id="reading"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="e.g., 4.5"
                value={newLog.reading}
                onChange={(e) => setNewLog({ ...newLog, reading: e.target.value })}
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log_time" className="text-base">Time of Day</Label>
              <Select
                value={newLog.log_time}
                onValueChange={(value: 'AM' | 'PM') => setNewLog({ ...newLog, log_time: value })}
              >
                <SelectTrigger className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AM">Morning (AM)</SelectItem>
                  <SelectItem value="PM">Afternoon (PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsLogDialogOpen(false)}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleLogTemperature}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Log Temperature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Cards */}
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
            <div className="text-2xl sm:text-3xl font-bold">{todayLogs.length}</div>
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

      {/* Compliance Chart */}
      {practiceId && (
        <FridgeComplianceChart stats={weeklyStats} />
      )}

      {/* Main Content Grid */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {/* Registered Fridges */}
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
                  <div key={fridge.id} className="flex items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-medium text-sm sm:text-base truncate">{fridge.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {fridge.location && `${fridge.location} • `}
                        Range: {fridge.min_temp}°C - {fridge.max_temp}°C
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingFridge(fridge)}
                        className="min-h-[44px] min-w-[44px] flex-shrink-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteFridge(fridge.id, fridge.name)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px] min-w-[44px] flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historical Log View */}
        {practiceId && (
          <HistoricalLogView
            practiceId={practiceId}
            fridges={fridges}
            onSelectBreachLog={setSelectedBreachLog}
            onStatsChange={setWeeklyStats}
          />
        )}
      </div>

      {/* Edit Fridge Dialog */}
      <EditFridgeDialog
        fridge={editingFridge}
        open={!!editingFridge}
        onOpenChange={(open) => !open && setEditingFridge(null)}
        onSuccess={fetchData}
      />

      {/* Remedial Action Dialog */}
      <RemedialActionDialog
        log={selectedBreachLog}
        open={!!selectedBreachLog}
        onOpenChange={(open) => !open && setSelectedBreachLog(null)}
        onSuccess={fetchData}
      />
    </div>
  );
}
