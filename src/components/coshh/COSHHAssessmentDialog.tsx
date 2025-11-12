import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface COSHHAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  assessment?: any;
}

export function COSHHAssessmentDialog({ open, onOpenChange, onSuccess, assessment }: COSHHAssessmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    substance_name: assessment?.substance_name || '',
    manufacturer: assessment?.manufacturer || '',
    hazard_sheet_url: assessment?.hazard_sheet_url || '',
    risk_level: assessment?.risk_level || 'MEDIUM',
    usage_description: assessment?.usage_description || '',
    hazard_flags: {
      toxic: false,
      corrosive: false,
      irritant: false,
      flammable: false,
      harmful: false,
      sensitizer: false
    },
    routes: {
      inhaled: false,
      ingested: false,
      skin: false,
      eyes: false
    },
    ppe: {
      gloves: false,
      eye_protection: false,
      mask: false,
      respirator: false,
      apron: false
    },
    emergency_controls: {
      eyes: '',
      skin: '',
      ingestion: '',
      inhalation: '',
      spillage: '',
      disposal: ''
    }
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userData } = await supabase
        .from('users')
        .select('practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userData) throw new Error('User data not found');

      const payload = {
        practice_id: userData.practice_id,
        substance_name: formData.substance_name,
        manufacturer: formData.manufacturer,
        hazard_sheet_url: formData.hazard_sheet_url || null,
        risk_level: formData.risk_level,
        usage_description: formData.usage_description,
        hazard_flags: formData.hazard_flags,
        routes: formData.routes,
        ppe: formData.ppe,
        emergency_controls: formData.emergency_controls
      };

      if (assessment) {
        const { error } = await supabase
          .from('coshh_assessments')
          .update(payload)
          .eq('id', assessment.id);
        if (error) throw error;
        toast.success('COSHH assessment updated');
      } else {
        const { error } = await supabase
          .from('coshh_assessments')
          .insert([payload]);
        if (error) throw error;
        toast.success('COSHH assessment created');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving COSHH assessment:', error);
      toast.error('Failed to save COSHH assessment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assessment ? 'Edit' : 'Create'} COSHH Assessment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="substance_name">Substance Name *</Label>
              <Input
                id="substance_name"
                value={formData.substance_name}
                onChange={(e) => setFormData({ ...formData, substance_name: e.target.value })}
                placeholder="e.g., Bleach, Disinfectant..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hazard_sheet_url">Safety Data Sheet (SDS) URL</Label>
            <Input
              id="hazard_sheet_url"
              value={formData.hazard_sheet_url}
              onChange={(e) => setFormData({ ...formData, hazard_sheet_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="risk_level">Risk Level *</Label>
              <Select value={formData.risk_level} onValueChange={(value) => setFormData({ ...formData, risk_level: value })}>
                <SelectTrigger id="risk_level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="usage">Usage Description</Label>
              <Input
                id="usage"
                value={formData.usage_description}
                onChange={(e) => setFormData({ ...formData, usage_description: e.target.value })}
                placeholder="How is this substance used?"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Hazard Flags</Label>
            <div className="grid grid-cols-3 gap-4">
              {Object.keys(formData.hazard_flags).map((key) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`hazard_${key}`}
                    checked={formData.hazard_flags[key as keyof typeof formData.hazard_flags]}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      hazard_flags: { ...formData.hazard_flags, [key]: checked }
                    })}
                  />
                  <label htmlFor={`hazard_${key}`} className="text-sm capitalize cursor-pointer">
                    {key}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Exposure Routes</Label>
            <div className="grid grid-cols-4 gap-4">
              {Object.keys(formData.routes).map((key) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`route_${key}`}
                    checked={formData.routes[key as keyof typeof formData.routes]}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      routes: { ...formData.routes, [key]: checked }
                    })}
                  />
                  <label htmlFor={`route_${key}`} className="text-sm capitalize cursor-pointer">
                    {key}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Required PPE</Label>
            <div className="grid grid-cols-3 gap-4">
              {Object.keys(formData.ppe).map((key) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ppe_${key}`}
                    checked={formData.ppe[key as keyof typeof formData.ppe]}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      ppe: { ...formData.ppe, [key]: checked }
                    })}
                  />
                  <label htmlFor={`ppe_${key}`} className="text-sm capitalize cursor-pointer">
                    {key.replace('_', ' ')}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Emergency Controls</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="em_eyes" className="text-sm">Eyes</Label>
                <Textarea
                  id="em_eyes"
                  value={formData.emergency_controls.eyes}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergency_controls: { ...formData.emergency_controls, eyes: e.target.value }
                  })}
                  rows={2}
                  placeholder="Rinse with water..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="em_skin" className="text-sm">Skin</Label>
                <Textarea
                  id="em_skin"
                  value={formData.emergency_controls.skin}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergency_controls: { ...formData.emergency_controls, skin: e.target.value }
                  })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="em_spillage" className="text-sm">Spillage</Label>
                <Textarea
                  id="em_spillage"
                  value={formData.emergency_controls.spillage}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergency_controls: { ...formData.emergency_controls, spillage: e.target.value }
                  })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="em_disposal" className="text-sm">Disposal</Label>
                <Textarea
                  id="em_disposal"
                  value={formData.emergency_controls.disposal}
                  onChange={(e) => setFormData({
                    ...formData,
                    emergency_controls: { ...formData.emergency_controls, disposal: e.target.value }
                  })}
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.substance_name || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {assessment ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
