import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

interface FireRiskWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function FireRiskWizard({ open, onOpenChange, onSuccess }: FireRiskWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    assessor_name: '',
    assessor_role: '',
    premises: {
      building_name: '',
      address: '',
      occupancy_type: '',
      floors: 0,
      stairwells: 0,
      exits: 0
    },
    hazards: {
      ignition_sources: '',
      fuel_sources: '',
      processes: '',
      fire_spread_features: ''
    },
    maintenance: {
      weekly: '',
      monthly: '',
      six_monthly: '',
      annual: ''
    },
    emergency_plan: {
      narrative: '',
      muster_point: '',
      fire_marshals: '',
      emergency_contacts: ''
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

      const nextReviewDate = new Date();
      nextReviewDate.setFullYear(nextReviewDate.getFullYear() + 1);

      const { error } = await supabase
        .from('fire_risk_assessments_v2')
        .insert([{
          practice_id: userData.practice_id,
          assessment_date: new Date().toISOString().split('T')[0],
          next_review_date: nextReviewDate.toISOString().split('T')[0],
          assessor_name: formData.assessor_name,
          assessor_role: formData.assessor_role,
          premises: formData.premises,
          hazards: formData.hazards,
          maintenance: formData.maintenance,
          emergency_plan: formData.emergency_plan
        }]);

      if (error) throw error;

      toast.success('Fire Risk Assessment created successfully');
      onSuccess();
      onOpenChange(false);
      setStep(1);
    } catch (error: any) {
      console.error('Error creating FRA:', error);
      toast.error('Failed to create Fire Risk Assessment');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Assessor Details</h3>
            <div className="space-y-2">
              <Label htmlFor="assessor_name">Assessor Name *</Label>
              <Input
                id="assessor_name"
                value={formData.assessor_name}
                onChange={(e) => setFormData({ ...formData, assessor_name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessor_role">Role *</Label>
              <Input
                id="assessor_role"
                value={formData.assessor_role}
                onChange={(e) => setFormData({ ...formData, assessor_role: e.target.value })}
                placeholder="e.g., Practice Manager, Estates Lead"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Premises Information</h3>
            <div className="space-y-2">
              <Label htmlFor="building_name">Building Name</Label>
              <Input
                id="building_name"
                value={formData.premises.building_name}
                onChange={(e) => setFormData({
                  ...formData,
                  premises: { ...formData.premises, building_name: e.target.value }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.premises.address}
                onChange={(e) => setFormData({
                  ...formData,
                  premises: { ...formData.premises, address: e.target.value }
                })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floors">Floors</Label>
                <Input
                  id="floors"
                  type="number"
                  value={formData.premises.floors}
                  onChange={(e) => setFormData({
                    ...formData,
                    premises: { ...formData.premises, floors: parseInt(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stairwells">Stairwells</Label>
                <Input
                  id="stairwells"
                  type="number"
                  value={formData.premises.stairwells}
                  onChange={(e) => setFormData({
                    ...formData,
                    premises: { ...formData.premises, stairwells: parseInt(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exits">Fire Exits</Label>
                <Input
                  id="exits"
                  type="number"
                  value={formData.premises.exits}
                  onChange={(e) => setFormData({
                    ...formData,
                    premises: { ...formData.premises, exits: parseInt(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Fire Hazards</h3>
            <div className="space-y-2">
              <Label htmlFor="ignition">Ignition Sources</Label>
              <Textarea
                id="ignition"
                value={formData.hazards.ignition_sources}
                onChange={(e) => setFormData({
                  ...formData,
                  hazards: { ...formData.hazards, ignition_sources: e.target.value }
                })}
                placeholder="e.g., electrical equipment, heaters..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel">Fuel Sources</Label>
              <Textarea
                id="fuel"
                value={formData.hazards.fuel_sources}
                onChange={(e) => setFormData({
                  ...formData,
                  hazards: { ...formData.hazards, fuel_sources: e.target.value }
                })}
                placeholder="e.g., paper, furniture, cleaning products..."
                rows={2}
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Maintenance Schedule</h3>
            <div className="space-y-2">
              <Label htmlFor="weekly">Weekly Checks</Label>
              <Textarea
                id="weekly"
                value={formData.maintenance.weekly}
                onChange={(e) => setFormData({
                  ...formData,
                  maintenance: { ...formData.maintenance, weekly: e.target.value }
                })}
                placeholder="e.g., Fire alarm test, Emergency lighting..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly">Monthly Checks</Label>
              <Textarea
                id="monthly"
                value={formData.maintenance.monthly}
                onChange={(e) => setFormData({
                  ...formData,
                  maintenance: { ...formData.maintenance, monthly: e.target.value }
                })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual">Annual Checks</Label>
              <Textarea
                id="annual"
                value={formData.maintenance.annual}
                onChange={(e) => setFormData({
                  ...formData,
                  maintenance: { ...formData.maintenance, annual: e.target.value }
                })}
                placeholder="e.g., Fire extinguisher service, Fire alarm service..."
                rows={2}
              />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Fire Emergency Plan (FEP)</h3>
            <div className="space-y-2">
              <Label htmlFor="fep_narrative">Emergency Procedures</Label>
              <Textarea
                id="fep_narrative"
                value={formData.emergency_plan.narrative}
                onChange={(e) => setFormData({
                  ...formData,
                  emergency_plan: { ...formData.emergency_plan, narrative: e.target.value }
                })}
                placeholder="Describe evacuation procedures..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="muster_point">Muster Point</Label>
              <Input
                id="muster_point"
                value={formData.emergency_plan.muster_point}
                onChange={(e) => setFormData({
                  ...formData,
                  emergency_plan: { ...formData.emergency_plan, muster_point: e.target.value }
                })}
                placeholder="Location of assembly point"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marshals">Fire Marshals</Label>
              <Textarea
                id="marshals"
                value={formData.emergency_plan.fire_marshals}
                onChange={(e) => setFormData({
                  ...formData,
                  emergency_plan: { ...formData.emergency_plan, fire_marshals: e.target.value }
                })}
                placeholder="List fire marshal names and roles"
                rows={2}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fire Risk Assessment Wizard (Step {step}/5)</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {renderStep()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!formData.assessor_name || !formData.assessor_role}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Assessment
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
