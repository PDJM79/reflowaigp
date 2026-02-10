import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";

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
  const [formData, setFormData] = useState({
    name: '',
    room_type: 'other',
    location: '',
    cleaning_frequency: 'daily',
  });

  const handleSave = () => {
    toast("This feature will be available in a future update", {
      description: "Room management is coming soon"
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Room Management</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-base sm:text-lg">Add New Room</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room-name" className="text-base">Room Name *</Label>
                <Input
                  id="room-name"
                  placeholder="e.g., Consultation Room 1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-11 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-type" className="text-base">Room Type</Label>
                <Select value={formData.room_type} onValueChange={(value) => setFormData({ ...formData, room_type: value })}>
                  <SelectTrigger id="room-type" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value} className="py-3">{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-location" className="text-base">Location</Label>
                <Input
                  id="room-location"
                  placeholder="e.g., Ground Floor"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="h-11 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cleaning-frequency" className="text-base">Cleaning Frequency</Label>
                <Select value={formData.cleaning_frequency} onValueChange={(value) => setFormData({ ...formData, cleaning_frequency: value })}>
                  <SelectTrigger id="cleaning-frequency" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLEANING_FREQUENCIES.map(freq => (
                      <SelectItem key={freq.value} value={freq.value} className="py-3">{freq.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleSave}
                disabled={!formData.name}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Add Room
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-base sm:text-lg">Current Rooms (0)</h3>
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No rooms added yet.</p>
              <p className="text-sm mt-1">This feature will be available in a future update.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[44px]"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
