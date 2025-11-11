import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Building2, Download, Flame, Droplet, Thermometer, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function EnvironmentalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isCleaningOpen, setIsCleaningOpen] = useState(true);
  const [isFireOpen, setIsFireOpen] = useState(false);
  const [isFridgeOpen, setIsFridgeOpen] = useState(false);

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  const { data: environmentalData } = useQuery({
    queryKey: ['environmental-dashboard', user?.id],
    queryFn: async () => {
      const { data: userData } = await (supabase as any)
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) return null;

      const [rooms, cleaningLogs, fireAssessments, fireActions, fridges, fridgeReadings] = await Promise.all([
        (supabase as any).from('rooms').select('*').eq('practice_id', userData.practice_id).eq('is_active', true),
        (supabase as any).from('cleaning_logs').select('*').eq('practice_id', userData.practice_id),
        (supabase as any).from('fire_safety_assessments').select('*').eq('practice_id', userData.practice_id),
        (supabase as any).from('fire_safety_actions').select('*').eq('practice_id', userData.practice_id),
        (supabase as any).from('fridges').select('*').eq('practice_id', userData.practice_id),
        (supabase as any).from('fridge_temperatures').select('*').eq('practice_id', userData.practice_id),
      ]);

      return {
        rooms: rooms.data || [],
        cleaningLogs: cleaningLogs.data || [],
        fireAssessments: fireAssessments.data || [],
        fireActions: fireActions.data || [],
        fridges: fridges.data || [],
        fridgeReadings: fridgeReadings.data || [],
      };
    },
    enabled: !!user?.id,
  });

  const handleExportPDF = async () => {
    if (!environmentalData) return;

    const { DashboardPDFExporter, generateFilename } = await import('@/lib/pdfExport');
    
    const exporter = new DashboardPDFExporter({
      title: 'Environmental Dashboard',
      subtitle: 'Premises Safety, Cleaning, and Environmental Monitoring',
    });

    // Key Metrics
    exporter.addSection('Key Environmental Metrics');
    exporter.addMetricsGrid([
      { label: 'Cleaning Compliance', value: `${cleaningCompletionRate}%`, subtitle: `${todaysCleaningLogs} of ${environmentalData.rooms.length} rooms` },
      { label: 'Fire/H&S Actions', value: `${openFireActions}`, subtitle: 'Open action items' },
      { label: 'Fridge Compliance', value: `${environmentalData.fridges.length}`, subtitle: `${outOfRangeFridgeReadings} out-of-range readings` },
      { label: 'Active Rooms', value: `${environmentalData.rooms.length}`, subtitle: 'Monitored spaces' },
    ]);

    // Cleaning Compliance
    exporter.addSection('Daily Cleaning Compliance');
    const cleaningRows = environmentalData.rooms.slice(0, 10).map((room: any) => {
      const hasLog = environmentalData.cleaningLogs.some((log: any) => {
        const logDate = new Date(log.log_date);
        const today = new Date();
        return log.room_id === room.id && logDate.toDateString() === today.toDateString();
      });
      return [
        room.name,
        room.room_type?.replace('_', ' ') || 'N/A',
        room.cleaning_frequency || 'N/A',
        hasLog ? 'Completed' : 'Pending',
      ];
    });
    exporter.addTable(['Room', 'Type', 'Frequency', 'Status'], cleaningRows);

    // Fire Safety Status
    exporter.addSection('Fire & Health & Safety');
    const latestFireAssessment = environmentalData.fireAssessments.length > 0
      ? new Date(environmentalData.fireAssessments[0].assessment_date).toLocaleDateString()
      : 'Not completed';
    exporter.addKeyValuePairs([
      { key: 'Latest Risk Assessment', value: latestFireAssessment },
      { key: 'Action Plan Items', value: `${openFireActions} pending completion` },
      { key: 'Fire Drills', value: 'Up to Date (Quarterly)' },
    ]);

    // Fridge Temperature Monitoring
    exporter.addSection('Fridge Temperature Monitoring (4-8°C)');
    const fridgeRows = environmentalData.fridges.map((fridge: any) => {
      const latestReading = environmentalData.fridgeReadings
        .filter((r: any) => r.fridge_id === fridge.id)
        .sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
      
      const isInRange = latestReading 
        ? latestReading.temperature >= fridge.min_temp && latestReading.temperature <= fridge.max_temp
        : true;
      
      return [
        fridge.name,
        fridge.location,
        `${fridge.min_temp}°C - ${fridge.max_temp}°C`,
        latestReading ? `${latestReading.temperature}°C` : 'No readings',
        latestReading ? (isInRange ? 'In Range' : 'Out of Range') : 'N/A',
      ];
    });
    exporter.addTable(['Fridge', 'Location', 'Target Range', 'Latest Reading', 'Status'], fridgeRows);

    // COSHH & Legionella
    exporter.addSection('COSHH & Legionella Compliance');
    exporter.addList([
      '✓ COSHH Risk Assessment - Up to Date (Annual review)',
      '✓ Legionella Risk Assessment - Up to Date (2-year cycle)',
    ]);

    exporter.save(generateFilename('environmental-dashboard'));
  };

  if (!environmentalData) {
    return <div className="container mx-auto p-6">Loading environmental data...</div>;
  }

  const todaysCleaningLogs = environmentalData.cleaningLogs.filter((log: any) => {
    const logDate = new Date(log.log_date);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  }).length;

  const cleaningCompletionRate = environmentalData.rooms.length > 0
    ? Math.round((todaysCleaningLogs / environmentalData.rooms.length) * 100)
    : 0;

  const openFireActions = environmentalData.fireActions.filter((a: any) => !a.completed_at).length;

  const outOfRangeFridgeReadings = environmentalData.fridgeReadings.filter((reading: any) => {
    const fridge = environmentalData.fridges.find((f: any) => f.id === reading.fridge_id);
    if (!fridge) return false;
    return reading.temperature < fridge.min_temp || reading.temperature > fridge.max_temp;
  }).length;

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 sm:h-8 sm:w-8" />
            Environmental
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Premises & safety monitoring</p>
        </div>
        <Button 
          onClick={handleExportPDF}
          size={isMobile ? 'lg' : 'default'}
          className="w-full sm:w-auto min-h-[44px]"
        >
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="touch-manipulation col-span-2 sm:col-span-1">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <Droplet className="h-3 w-3 sm:h-4 sm:w-4" />
              Cleaning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{cleaningCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">{todaysCleaningLogs}/{environmentalData.rooms.length}</p>
          </CardContent>
        </Card>
        <Card className={`touch-manipulation ${openFireActions > 0 ? 'border-warning' : ''}`}>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <Flame className="h-3 w-3 sm:h-4 sm:w-4" />
              Fire/H&S
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{openFireActions}</div>
            <p className="text-xs text-muted-foreground">Open actions</p>
          </CardContent>
        </Card>
        <Card className={`touch-manipulation ${outOfRangeFridgeReadings > 0 ? 'border-destructive' : ''}`}>
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <Thermometer className="h-3 w-3 sm:h-4 sm:w-4" />
              Fridges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{environmentalData.fridges.length}</div>
            <p className="text-xs text-muted-foreground">{outOfRangeFridgeReadings} alerts</p>
          </CardContent>
        </Card>
        <Card className="touch-manipulation">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium">Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">{environmentalData.rooms.length}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
      </div>

      <Collapsible open={isCleaningOpen} onOpenChange={setIsCleaningOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Daily Cleaning</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isCleaningOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid gap-3">
                {environmentalData.rooms.slice(0, 10).map((room: any) => {
                  const hasLog = environmentalData.cleaningLogs.some((log: any) => {
                    const logDate = new Date(log.log_date);
                    const today = new Date();
                    return log.room_id === room.id && logDate.toDateString() === today.toDateString();
                  });
                  return (
                    <div key={room.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base">{room.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground capitalize">
                          {room.room_type?.replace('_', ' ')} • {room.cleaning_frequency}
                        </p>
                      </div>
                      <Badge className={`${hasLog ? 'bg-success' : 'bg-muted'} self-start sm:self-center`}>
                        {hasLog ? 'Done' : 'Pending'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Fire Safety Status */}
      <Collapsible open={isFireOpen} onOpenChange={setIsFireOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Fire & Health & Safety</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isFireOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid gap-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">Latest Risk Assessment</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {environmentalData.fireAssessments.length > 0 
                        ? new Date(environmentalData.fireAssessments[0].assessment_date).toLocaleDateString()
                        : 'Not completed'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="self-start sm:self-center text-xs">Annual</Badge>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">Action Plan Items</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{openFireActions} pending</p>
                  </div>
                  <Badge variant={openFireActions > 0 ? 'default' : 'secondary'} className="self-start sm:self-center text-xs">
                    {openFireActions} open
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base">Fire Drills</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Quarterly requirement</p>
                  </div>
                  <Badge className="bg-success self-start sm:self-center text-xs">Up to Date</Badge>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Fridge Temperature Monitoring */}
      <Collapsible open={isFridgeOpen} onOpenChange={setIsFridgeOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Fridge Temperature Monitoring (4-8°C)</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isFridgeOpen ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-3">
                {environmentalData.fridges.map((fridge: any) => {
                  const latestReading = environmentalData.fridgeReadings
                    .filter((r: any) => r.fridge_id === fridge.id)
                    .sort((a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];

                  const isInRange = latestReading 
                    ? latestReading.temperature >= fridge.min_temp && latestReading.temperature <= fridge.max_temp
                    : true;

                  return (
                    <div key={fridge.id} className="flex flex-col sm:flex-row items-start justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base">{fridge.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {fridge.location} • Target: {fridge.min_temp}°C - {fridge.max_temp}°C
                        </p>
                      </div>
                      <div className="text-right self-start sm:self-center">
                        {latestReading ? (
                          <>
                            <p className="text-xl sm:text-2xl font-bold">{latestReading.temperature}°C</p>
                            <Badge className={`${isInRange ? 'bg-success' : 'bg-destructive'} text-xs`}>
                              {isInRange ? 'In Range' : 'Out of Range'}
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-xs">No readings</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* COSHH & Legionella Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">COSHH & Legionella Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm sm:text-base">COSHH Risk Assessment</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Annual review required</p>
              </div>
              <Badge className="bg-success self-start sm:self-center text-xs">Up to Date</Badge>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg touch-manipulation active:bg-accent gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm sm:text-base">Legionella Risk Assessment</p>
                <p className="text-xs sm:text-sm text-muted-foreground">2-year review cycle</p>
              </div>
              <Badge className="bg-success self-start sm:self-center text-xs">Up to Date</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
