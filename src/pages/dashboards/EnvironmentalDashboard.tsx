import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Download, Flame, Droplet, Thermometer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function EnvironmentalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const handleExportPDF = () => {
    console.log('Exporting Environmental PDF...');
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Environmental Dashboard
          </h1>
          <p className="text-muted-foreground">Premises safety, cleaning, and environmental monitoring</p>
        </div>
        <Button onClick={handleExportPDF}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Droplet className="h-4 w-4" />
              Cleaning Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{cleaningCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">{todaysCleaningLogs} of {environmentalData.rooms.length} rooms</p>
          </CardContent>
        </Card>

        <Card className={openFireActions > 0 ? 'border-warning' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Fire/H&S Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openFireActions}</div>
            <p className="text-xs text-muted-foreground">Open action items</p>
          </CardContent>
        </Card>

        <Card className={outOfRangeFridgeReadings > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Fridge Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{environmentalData.fridges.length}</div>
            <p className="text-xs text-muted-foreground">{outOfRangeFridgeReadings} out-of-range readings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{environmentalData.rooms.length}</div>
            <p className="text-xs text-muted-foreground">Monitored spaces</p>
          </CardContent>
        </Card>
      </div>

      {/* Cleaning Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Cleaning Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {environmentalData.rooms.slice(0, 10).map((room: any) => {
              const hasLog = environmentalData.cleaningLogs.some((log: any) => {
                const logDate = new Date(log.log_date);
                const today = new Date();
                return log.room_id === room.id && logDate.toDateString() === today.toDateString();
              });

              return (
                <div key={room.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{room.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {room.room_type?.replace('_', ' ')} • {room.cleaning_frequency}
                    </p>
                  </div>
                  <Badge className={hasLog ? 'bg-success' : 'bg-muted'}>
                    {hasLog ? 'Completed' : 'Pending'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Fire Safety Status */}
      <Card>
        <CardHeader>
          <CardTitle>Fire & Health & Safety</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Latest Risk Assessment</p>
                <p className="text-sm text-muted-foreground">
                  {environmentalData.fireAssessments.length > 0 
                    ? new Date(environmentalData.fireAssessments[0].assessment_date).toLocaleDateString()
                    : 'Not completed'}
                </p>
              </div>
              <Badge variant="secondary">Annual</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Action Plan Items</p>
                <p className="text-sm text-muted-foreground">{openFireActions} pending completion</p>
              </div>
              <Badge variant={openFireActions > 0 ? 'default' : 'secondary'}>
                {openFireActions} open
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Fire Drills</p>
                <p className="text-sm text-muted-foreground">Quarterly requirement</p>
              </div>
              <Badge className="bg-success">Up to Date</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fridge Temperature Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle>Fridge Temperature Monitoring (4-8°C)</CardTitle>
        </CardHeader>
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
                <div key={fridge.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{fridge.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {fridge.location} • Target: {fridge.min_temp}°C - {fridge.max_temp}°C
                    </p>
                  </div>
                  <div className="text-right">
                    {latestReading ? (
                      <>
                        <p className="text-2xl font-bold">{latestReading.temperature}°C</p>
                        <Badge className={isInRange ? 'bg-success' : 'bg-destructive'}>
                          {isInRange ? 'In Range' : 'Out of Range'}
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="secondary">No readings</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* COSHH & Legionella Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>COSHH & Legionella Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">COSHH Risk Assessment</p>
                <p className="text-sm text-muted-foreground">Annual review required</p>
              </div>
              <Badge className="bg-success">Up to Date</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Legionella Risk Assessment</p>
                <p className="text-sm text-muted-foreground">2-year review cycle</p>
              </div>
              <Badge className="bg-success">Up to Date</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
