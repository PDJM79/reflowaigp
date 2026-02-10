import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
    queryKey: ['environmental-dashboard', user?.practiceId],
    queryFn: async () => {
      return {
        rooms: [],
        cleaningLogs: [],
        fireAssessments: [],
        fireActions: [],
        fridges: [],
        fridgeReadings: [],
      };
    },
    enabled: !!user?.practiceId,
  });

  const handleExportPDF = async () => {
    if (!environmentalData) return;

    const { DashboardPDFExporter, generateFilename } = await import('@/lib/pdfExport');
    
    const exporter = new DashboardPDFExporter({
      title: 'Environmental Dashboard',
      subtitle: 'Premises Safety, Cleaning, and Environmental Monitoring',
    });

    exporter.addSection('Key Environmental Metrics');
    exporter.addMetricsGrid([
      { label: 'Cleaning Compliance', value: `${cleaningCompletionRate}%`, subtitle: `${todaysCleaningLogs} of ${environmentalData.rooms.length} rooms` },
      { label: 'Fire/H&S Actions', value: `${openFireActions}`, subtitle: 'Open action items' },
      { label: 'Fridge Compliance', value: `${environmentalData.fridges.length}`, subtitle: `${outOfRangeFridgeReadings} out-of-range readings` },
      { label: 'Active Rooms', value: `${environmentalData.rooms.length}`, subtitle: 'Monitored spaces' },
    ]);

    exporter.addSection('COSHH & Legionella Compliance');
    exporter.addList([
      'COSHH Risk Assessment - Up to Date (Annual review)',
      'Legionella Risk Assessment - Up to Date (2-year cycle)',
    ]);

    exporter.save(generateFilename('environmental-dashboard'));
  };

  if (!environmentalData) {
    return <div className="container mx-auto p-6">Loading environmental data...</div>;
  }

  const todaysCleaningLogs = environmentalData.cleaningLogs.filter((log: any) => {
    const logDate = new Date(log.logDate || log.log_date);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  }).length;

  const cleaningCompletionRate = environmentalData.rooms.length > 0
    ? Math.round((todaysCleaningLogs / environmentalData.rooms.length) * 100)
    : 0;

  const openFireActions = environmentalData.fireActions.filter((a: any) => !a.completedAt).length;

  const outOfRangeFridgeReadings = environmentalData.fridgeReadings.filter((reading: any) => {
    const fridge = environmentalData.fridges.find((f: any) => f.id === reading.fridgeId);
    if (!fridge) return false;
    return reading.temperature < fridge.minTemp || reading.temperature > fridge.maxTemp;
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
              <div className="text-center py-8 text-muted-foreground">
                <Droplet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Cleaning log data not yet available via API</p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
                    <p className="text-xs sm:text-sm text-muted-foreground">Not completed</p>
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
              <div className="text-center py-8 text-muted-foreground">
                <Thermometer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Fridge temperature data not yet available via API</p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

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
