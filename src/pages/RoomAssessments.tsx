import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RoomAssessmentDialog } from "@/components/rooms/RoomAssessmentDialog";
import { format, parseISO, isPast, differenceInDays } from "date-fns";

export default function RoomAssessments() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

      const [roomsRes, assessmentsRes] = await Promise.all([
        supabase
          .from('rooms')
          .select('*')
          .eq('practice_id', userData.practice_id)
          .order('name'),
        supabase
          .from('room_assessments')
          .select('*')
          .eq('practice_id', userData.practice_id)
          .order('assessment_date', { ascending: false })
      ]);

      if (roomsRes.error) throw roomsRes.error;
      if (assessmentsRes.error) throw assessmentsRes.error;

      setRooms(roomsRes.data || []);
      setAssessments(assessmentsRes.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load room assessments');
    } finally {
      setLoading(false);
    }
  };

  const getLastAssessment = (roomId: string) => {
    return assessments.find(a => a.room_id === roomId);
  };

  const getAssessmentStatus = (lastAssessment: any) => {
    if (!lastAssessment) {
      return { label: 'Never Assessed', variant: 'destructive' as const, daysUntilDue: null };
    }

    const nextDue = lastAssessment.next_due_date ? parseISO(lastAssessment.next_due_date) : null;
    if (!nextDue) {
      return { label: 'No Next Date', variant: 'secondary' as const, daysUntilDue: null };
    }

    const daysUntilDue = differenceInDays(nextDue, new Date());
    
    if (isPast(nextDue)) {
      return { label: 'Overdue', variant: 'destructive' as const, daysUntilDue };
    } else if (daysUntilDue <= 30) {
      return { label: 'Due Soon', variant: 'warning' as const, daysUntilDue };
    } else {
      return { label: 'Current', variant: 'success' as const, daysUntilDue };
    }
  };

  const handleAssess = (roomId: string) => {
    setSelectedRoomId(roomId);
    setDialogOpen(true);
  };

  if (loading) return <AppLayout><p>Loading room assessments...</p></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Annual Room Assessments</h1>
            <p className="text-muted-foreground mt-1">
              Track annual safety assessments for all practice rooms
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rooms Requiring Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room Name</TableHead>
                  <TableHead>Room Type</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Last Assessment</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => {
                  const lastAssessment = getLastAssessment(room.id);
                  const status = getAssessmentStatus(lastAssessment);
                  
                  return (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                      <TableCell className="capitalize">{room.room_type || '-'}</TableCell>
                      <TableCell>{room.floor || '-'}</TableCell>
                      <TableCell>
                        {lastAssessment ? format(parseISO(lastAssessment.assessment_date), 'dd MMM yyyy') : 'Never'}
                      </TableCell>
                      <TableCell>
                        {lastAssessment?.next_due_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(parseISO(lastAssessment.next_due_date), 'dd MMM yyyy')}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleAssess(room.id)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Assess
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {rooms.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                <p>No rooms found. Add rooms in the Cleaning module first.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedRoomId && (
          <RoomAssessmentDialog
            roomId={selectedRoomId}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSuccess={fetchData}
          />
        )}
      </div>
    </AppLayout>
  );
}
