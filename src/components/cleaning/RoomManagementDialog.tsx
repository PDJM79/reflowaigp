import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface RoomManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROOM_TYPES = [
  { value: 'consultation', label: 'Consultation Room' },
  { value: 'treatment', label: 'Treatment Room' },
  { value: 'office', label: 'Office' },
  { value: 'toilet', label: 'Toilet' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'waiting', label: 'Waiting Area' },
  { value: 'other', label: 'Other' },
];

const CLEANING_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function RoomManagementDialog({ open, onOpenChange }: RoomManagementDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    room_type: 'other',
    location: '',
    cleaning_frequency: 'daily',
  });

  const { data: rawRooms, isLoading } = useQuery({
    queryKey: ['rooms-management', user?.id],
    queryFn: async () => {
      const userResult = await (supabase as any)
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .maybeSingle();

      if (!userResult?.data?.practice_id) return [];

      const roomsResult = await (supabase as any)
        .from('rooms')
        .select('*')
        .eq('practice_id', userResult.data.practice_id)
        .eq('is_active', true)
        .order('name');

      return roomsResult?.data || [];
    },
    enabled: open && !!user?.id,
  });

  const rooms = (rawRooms || []) as any[];

  // Create/Update room mutation
  const saveRoomMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user?.id)
        .single();

      if (!userData) throw new Error('User not found');

      if (editingRoom) {
        // Update existing room
        const { error } = await supabase
          .from('rooms')
          .update({
            name: formData.name,
            room_type: formData.room_type,
            location: formData.location,
            cleaning_frequency: formData.cleaning_frequency,
          } as any)
          .eq('id', editingRoom.id);

        if (error) throw error;
      } else {
        // Create new room
        const { error } = await supabase
          .from('rooms')
          .insert({
            practice_id: userData.practice_id,
            name: formData.name,
            room_type: formData.room_type,
            location: formData.location,
            cleaning_frequency: formData.cleaning_frequency,
            is_active: true,
          } as any);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingRoom ? 'Room updated' : 'Room created');
      queryClient.invalidateQueries({ queryKey: ['rooms-management'] });
      resetForm();
    },
    onError: (error: Error) => {
      toast.error('Failed to save room', { description: error.message });
    },
  });

  // Delete room mutation (soft delete)
  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase
        .from('rooms')
        .update({ is_active: false } as any)
        .eq('id', roomId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Room deleted');
      queryClient.invalidateQueries({ queryKey: ['rooms-management'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete room', { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      room_type: 'other',
      location: '',
      cleaning_frequency: 'daily',
    });
    setEditingRoom(null);
  };

  const handleEdit = (room: any) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      room_type: room.room_type || 'other',
      location: room.location || '',
      cleaning_frequency: room.cleaning_frequency || 'daily',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Room Management</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add/Edit Room Form */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">{editingRoom ? 'Edit Room' : 'Add New Room'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name *</Label>
                <Input
                  id="room-name"
                  placeholder="e.g., Consultation Room 1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-type">Room Type</Label>
                <Select value={formData.room_type} onValueChange={(value) => setFormData({ ...formData, room_type: value })}>
                  <SelectTrigger id="room-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-location">Location</Label>
                <Input
                  id="room-location"
                  placeholder="e.g., Ground Floor"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cleaning-frequency">Cleaning Frequency</Label>
                <Select value={formData.cleaning_frequency} onValueChange={(value) => setFormData({ ...formData, cleaning_frequency: value })}>
                  <SelectTrigger id="cleaning-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLEANING_FREQUENCIES.map(freq => (
                      <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => saveRoomMutation.mutate()}
                disabled={!formData.name || saveRoomMutation.isPending}
              >
                {saveRoomMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingRoom ? 'Update Room' : 'Add Room'}
              </Button>
              {editingRoom && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Rooms List */}
          <div>
            <h3 className="font-semibold mb-4">Current Rooms ({rooms.length})</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No rooms added yet. Add your first room above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {ROOM_TYPES.find(t => t.value === room.room_type)?.label || room.room_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{room.location || '-'}</TableCell>
                      <TableCell>
                        {CLEANING_FREQUENCIES.find(f => f.value === room.cleaning_frequency)?.label || 'Daily'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(room)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRoomMutation.mutate(room.id)}
                            disabled={deleteRoomMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
