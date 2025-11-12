import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ZoneTypeIcon } from "@/components/cleaning/ZoneTypeIcon";

export function CleaningZoneEditor() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [formData, setFormData] = useState({
    zone_name: '',
    zone_type: 'clinical' as 'clinical' | 'waiting' | 'toilet' | 'staff' | 'office' | 'kitchen' | 'corridor' | 'other',
    floor: '',
    is_active: true
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      const { data, error } = await supabase
        .from('cleaning_zones')
        .select('*')
        .eq('practice_id', userData.practice_id)
        .order('zone_name');

      if (error) throw error;
      setZones(data || []);
    } catch (error: any) {
      console.error('Error fetching zones:', error);
      toast.error('Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      if (editingZone) {
        const { error } = await supabase
          .from('cleaning_zones')
          .update(formData)
          .eq('id', editingZone.id);

        if (error) throw error;
        toast.success('Zone updated successfully');
      } else {
        const { error } = await supabase
          .from('cleaning_zones')
          .insert({
            ...formData,
            practice_id: userData.practice_id
          });

        if (error) throw error;
        toast.success('Zone created successfully');
      }

      setFormData({ zone_name: '', zone_type: 'clinical', floor: '', is_active: true });
      setEditingZone(null);
      fetchZones();
    } catch (error: any) {
      console.error('Error saving zone:', error);
      toast.error(error.message || 'Failed to save zone');
    }
  };

  const handleEdit = (zone: any) => {
    setEditingZone(zone);
    setFormData({
      zone_name: zone.zone_name,
      zone_type: zone.zone_type,
      floor: zone.floor || '',
      is_active: zone.is_active
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this zone?')) return;

    try {
      const { error } = await supabase
        .from('cleaning_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Zone deleted successfully');
      fetchZones();
    } catch (error: any) {
      console.error('Error deleting zone:', error);
      toast.error(error.message || 'Failed to delete zone');
    }
  };

  if (loading) return <p>Loading zones...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingZone ? 'Edit' : 'Add'} Cleaning Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zone_name">Zone Name *</Label>
                <Input
                  id="zone_name"
                  value={formData.zone_name}
                  onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })}
                  placeholder="e.g., Consultation Room 1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone_type">Zone Type *</Label>
                <Select
                  value={formData.zone_type}
                  onValueChange={(value: any) => setFormData({ ...formData, zone_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinical">Clinical</SelectItem>
                    <SelectItem value="waiting">Waiting Area</SelectItem>
                    <SelectItem value="toilet">Toilet</SelectItem>
                    <SelectItem value="staff">Staff Room</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="corridor">Corridor</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor">Floor/Location</Label>
                <Input
                  id="floor"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  placeholder="e.g., Ground Floor"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {editingZone && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingZone(null);
                    setFormData({ zone_name: '', zone_type: 'clinical', floor: '', is_active: true });
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit">
                {editingZone ? 'Update' : 'Add'} Zone
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zones ({zones.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">{zone.zone_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ZoneTypeIcon type={zone.zone_type} className="h-4 w-4" />
                      <span className="capitalize">{zone.zone_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{zone.floor || '—'}</TableCell>
                  <TableCell>
                    <span className={zone.is_active ? 'text-green-600' : 'text-gray-400'}>
                      {zone.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(zone)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(zone.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
