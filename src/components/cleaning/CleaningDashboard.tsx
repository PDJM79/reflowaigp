import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CleaningZoneEditor } from "@/modules/cleaning/CleaningZoneEditor";
import { CleaningTaskLibrary } from "@/components/cleaning/CleaningTaskLibrary";
import { CleaningWeeklyGrid } from "@/modules/cleaning/CleaningWeeklyGrid";
import { RoomManagementDialog } from "@/components/cleaning/RoomManagementDialog";
import { Download, Plus } from "lucide-react";

export function CleaningDashboard() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      const [roomsRes, zonesRes, tasksRes] = await Promise.all([
        supabase
          .from('rooms')
          .select('*')
          .eq('practice_id', userData.practice_id)
          .order('name'),
        supabase
          .from('cleaning_zones')
          .select('*')
          .eq('practice_id', userData.practice_id)
          .eq('is_active', true)
          .order('zone_name'),
        supabase
          .from('cleaning_tasks')
          .select('*')
          .eq('practice_id', userData.practice_id)
          .eq('is_active', true)
          .order('task_name')
      ]);

      if (roomsRes.error) throw roomsRes.error;
      if (zonesRes.error) throw zonesRes.error;
      if (tasksRes.error) throw tasksRes.error;

      setRooms(roomsRes.data || []);
      setZones(zonesRes.data || []);
      setTasks(tasksRes.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load cleaning data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading cleaning dashboard...</p>;

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
          <Button variant="outline">
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
            <div className="text-3xl font-bold">{rooms.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{zones.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Task Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tasks.length}</div>
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
        onSuccess={fetchData}
      />
    </div>
  );
}
