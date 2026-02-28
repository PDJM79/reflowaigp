import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CleaningZoneEditor } from "@/modules/cleaning/CleaningZoneEditor";
import { CleaningTaskLibrary } from "@/components/cleaning/CleaningTaskLibrary";
import { CleaningWeeklyGrid } from "@/modules/cleaning/CleaningWeeklyGrid";
import { RoomManagementDialog } from "@/components/cleaning/RoomManagementDialog";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";

export function CleaningDashboard() {
  const { user } = useAuth();
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [stats, setStats] = useState({ zones: 0, tasks: 0, rooms: 0 });

  useEffect(() => {
    if (!user?.practiceId) return;
    const fetchStats = async () => {
      const [zonesRes, tasksRes, roomsRes] = await Promise.all([
        supabase
          .from('cleaning_zones')
          .select('*', { count: 'exact', head: true })
          .eq('practice_id', user.practiceId)
          .eq('is_active', true),
        supabase
          .from('cleaning_tasks')
          .select('*', { count: 'exact', head: true })
          .eq('practice_id', user.practiceId)
          .eq('is_active', true),
        supabase
          .from('rooms')
          .select('*', { count: 'exact', head: true })
          .eq('practice_id', user.practiceId)
          .eq('is_active', true),
      ]);
      setStats({
        zones: zonesRes.count || 0,
        tasks: tasksRes.count || 0,
        rooms: roomsRes.count || 0,
      });
    };
    fetchStats();
  }, [user?.practiceId]);

  const handleExport = () => {
    toast("This feature will be available in a future update", {
      description: "Annex B export is coming soon"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">NHS Cleanliness 2025 Model</h2>
          <p className="text-muted-foreground">
            Manage zones, tasks, and weekly completion grids with 5-year retention
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRoomDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Manage Rooms
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Annex B
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.rooms}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.zones}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Task Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.tasks}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="weekly-grid" className="w-full">
        <TabsList>
          <TabsTrigger value="weekly-grid">Weekly Grid</TabsTrigger>
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="tasks">Task Library</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly-grid" className="mt-4">
          <CleaningWeeklyGrid />
        </TabsContent>

        <TabsContent value="zones" className="mt-4">
          <CleaningZoneEditor />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <CleaningTaskLibrary />
        </TabsContent>
      </Tabs>

      <RoomManagementDialog
        open={roomDialogOpen}
        onOpenChange={setRoomDialogOpen}
      />
    </div>
  );
}
