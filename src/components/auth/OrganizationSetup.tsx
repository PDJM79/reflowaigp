import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { RoleAssignment, AVAILABLE_ROLES } from '@/types/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OrganizationSetupProps {
  onComplete: () => void;
}

export function OrganizationSetup({ onComplete }: OrganizationSetupProps) {
  const [organizationName, setOrganizationName] = useState('');
  // Initialize with all available roles, empty name/email
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>(
    AVAILABLE_ROLES.map(role => ({ role: role.value, name: '', email: '' }))
  );
  const [loading, setLoading] = useState(false);

  const createStandardProcessTemplates = async (practiceId: string) => {
    const standardTemplates = [
      {
        name: 'Monthly Clinical Audit',
        responsible_role: 'administrator',
        frequency: 'monthly',
        steps: [
          {"title": "Review patient records", "description": "Review a sample of patient records for compliance"},
          {"title": "Document findings", "description": "Document any issues or compliance gaps found"},
          {"title": "Create action plan", "description": "Develop corrective actions for any identified issues"},
          {"title": "Submit audit report", "description": "Complete and submit the monthly audit report"}
        ],
        evidence_hint: 'Clinical audit documentation, compliance checklists',
        storage_hints: {"folder": "/clinical-audits", "system": "Practice Management System"},
        remedials: {"escalation": "Practice Manager", "deadline_extension": "5 days"}
      },
      {
        name: 'Weekly Staff Training Review',
        responsible_role: 'administrator',
        frequency: 'weekly',
        steps: [
          {"title": "Review training records", "description": "Check all staff have completed required training"},
          {"title": "Identify training gaps", "description": "Note any staff missing mandatory training"},
          {"title": "Schedule additional training", "description": "Book training sessions for staff as needed"},
          {"title": "Update training matrix", "description": "Update the staff training tracking matrix"}
        ],
        evidence_hint: 'Training certificates, attendance records',
        storage_hints: {"folder": "/staff-training", "system": "HR System"},
        remedials: {"escalation": "Practice Manager", "deadline_extension": "3 days"}
      },
      {
        name: 'Daily Equipment Check',
        responsible_role: 'gp',
        frequency: 'daily',
        steps: [
          {"title": "Check medical equipment", "description": "Verify all medical equipment is functioning properly"},
          {"title": "Test emergency equipment", "description": "Test defibrillator and emergency response equipment"},
          {"title": "Record readings", "description": "Log equipment readings and any issues found"},
          {"title": "Report issues", "description": "Report any equipment problems to maintenance"}
        ],
        evidence_hint: 'Equipment log sheets, maintenance records',
        storage_hints: {"folder": "/equipment-logs", "system": "Maintenance System"},
        remedials: {"escalation": "Practice Manager", "deadline_extension": "1 day"}
      },
      {
        name: 'Patient Safety Review',
        responsible_role: 'nurse',
        frequency: 'weekly',
        steps: [
          {"title": "Review incident reports", "description": "Review any patient safety incidents from the week"},
          {"title": "Assess risk levels", "description": "Evaluate the risk level of each incident"},
          {"title": "Implement improvements", "description": "Put in place any necessary safety improvements"},
          {"title": "Update safety protocols", "description": "Update safety protocols based on findings"}
        ],
        evidence_hint: 'Incident reports, safety checklists',
        storage_hints: {"folder": "/patient-safety", "system": "Incident Management System"},
        remedials: {"escalation": "Practice Manager", "deadline_extension": "2 days"}
      },
      {
        name: 'Monthly Infection Control Audit',
        responsible_role: 'nurse_lead',
        frequency: 'monthly',
        steps: [
          {"title": "Inspect clinical areas", "description": "Check all clinical areas for infection control compliance"},
          {"title": "Review cleaning logs", "description": "Verify cleaning and disinfection procedures are being followed"},
          {"title": "Check hand hygiene compliance", "description": "Assess staff hand hygiene practices"},
          {"title": "Update infection control policies", "description": "Update policies based on latest guidelines"}
        ],
        evidence_hint: 'Infection control checklists, cleaning logs',
        storage_hints: {"folder": "/infection-control", "system": "Clinical Management System"},
        remedials: {"escalation": "Practice Manager", "deadline_extension": "3 days"}
      },
      {
        name: 'Quarterly Financial Review',
        responsible_role: 'practice_manager',
        frequency: 'quarterly',
        steps: [
          {"title": "Review practice accounts", "description": "Analyze income, expenses, and profitability"},
          {"title": "Budget variance analysis", "description": "Compare actual vs budgeted figures"},
          {"title": "Cash flow forecast", "description": "Project cash flow for next quarter"},
          {"title": "Financial report preparation", "description": "Prepare summary for stakeholders"}
        ],
        evidence_hint: 'Financial statements, budget reports',
        storage_hints: {"folder": "/financial-records", "system": "Accounting System"},
        remedials: {"escalation": "Senior Partner", "deadline_extension": "7 days"}
      },
      {
        name: 'Daily Reception Procedures',
        responsible_role: 'reception_lead',
        frequency: 'daily',
        steps: [
          {"title": "Check appointment system", "description": "Verify appointment bookings and availability"},
          {"title": "Process patient calls", "description": "Handle patient inquiries and triage calls"},
          {"title": "Update patient records", "description": "Ensure patient information is current"},
          {"title": "End of day reconciliation", "description": "Balance cash, cards, and appointment records"}
        ],
        evidence_hint: 'Reception logs, appointment records',
        storage_hints: {"folder": "/reception-logs", "system": "Practice Management System"},
        remedials: {"escalation": "Practice Manager", "deadline_extension": "1 day"}
      },
      {
        name: 'Weekly Clinical Governance Review',
        responsible_role: 'cd_lead_gp',
        frequency: 'weekly',
        steps: [
          {"title": "Review clinical incidents", "description": "Analyze any clinical incidents from the week"},
          {"title": "Audit clinical decisions", "description": "Review sample of clinical decision making"},
          {"title": "Check prescribing patterns", "description": "Monitor prescribing for safety and effectiveness"},
          {"title": "Update clinical protocols", "description": "Revise protocols based on evidence and incidents"}
        ],
        evidence_hint: 'Clinical incident reports, prescribing data',
        storage_hints: {"folder": "/clinical-governance", "system": "Clinical System"},
        remedials: {"escalation": "Practice Manager", "deadline_extension": "2 days"}
      }
    ];

    try {
      const { error } = await supabase
        .from('process_templates')
        .insert(
          standardTemplates.map(template => ({
            practice_id: practiceId,
            name: template.name,
            responsible_role: template.responsible_role as any,
            frequency: template.frequency as any,
            steps: template.steps,
            evidence_hint: template.evidence_hint,
            storage_hints: template.storage_hints,
            remedials: template.remedials
          }))
        );

      if (error) {
        console.error('Error creating standard templates:', error);
        throw error;
      }

      console.log('Standard process templates created successfully');
    } catch (error) {
      console.error('Failed to create standard process templates:', error);
      // Don't fail the entire setup if templates fail
      toast({
        title: "Template creation warning",
        description: "Standard processes could not be created. You can add them manually later.",
        variant: "destructive",
      });
    }
  };

  const updateRoleAssignment = (index: number, field: keyof RoleAssignment, value: string) => {
    const updated = [...roleAssignments];
    updated[index] = { ...updated[index], [field]: value };
    setRoleAssignments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!organizationName.trim()) {
      toast({
        title: "Organization name required",
        description: "Please enter your organization name",
        variant: "destructive",
      });
      return;
    }

    // Only check for filled assignments (allow empty ones to be skipped)
    const filledAssignments = roleAssignments.filter(
      assignment => assignment.name.trim() || assignment.email.trim()
    );

    const invalidAssignments = filledAssignments.filter(
      assignment => !assignment.name.trim() || !assignment.email.trim()
    );

    if (invalidAssignments.length > 0) {
      toast({
        title: "Incomplete role assignments",
        description: "Please complete all started role assignments (both name and email required)",
        variant: "destructive",
      });
      return;
    }

    // Ensure at least practice manager is assigned
    const practiceManagerAssignment = filledAssignments.find(a => a.role === 'practice_manager');
    if (!practiceManagerAssignment) {
      toast({
        title: "Practice Manager required",
        description: "Please assign someone to the Practice Manager role",
        variant: "destructive",
      });
      return;
    }

    // Allow duplicate roles since one person can have multiple roles
    // No validation needed for duplicates anymore

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create practice
      const { data: practice, error: practiceError } = await supabase
        .from('practices')
        .insert({
          name: organizationName.trim()
        })
        .select()
        .single();

      if (practiceError) throw practiceError;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, practice_id')
        .eq('auth_user_id', user.id)
        .single();

      if (existingUser) {
        // Update existing user to be practice manager
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: practiceManagerAssignment.name,
            role: 'practice_manager',
            practice_id: practice.id,
            is_practice_manager: true
          })
          .eq('auth_user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new user record (practice manager)
        const { error: userError } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            email: user.email!,
            name: practiceManagerAssignment.name,
            role: 'practice_manager',
            practice_id: practice.id,
            is_practice_manager: true
          });

        if (userError) throw userError;
      }

      // Create user accounts for non-practice manager roles
      const nonPracticeManagerAssignments = filledAssignments.filter(
        assignment => assignment.role !== 'practice_manager'
      );

      for (const assignment of nonPracticeManagerAssignments) {
        try {
          const { data, error } = await supabase.functions.invoke('create-user-accounts', {
            body: {
              email: assignment.email,
              name: assignment.name,
              role: assignment.role,
              practice_id: practice.id
            }
          });

          if (error) {
            console.error(`Error creating user ${assignment.email}:`, error);
            toast({
              title: "User creation warning",
              description: `Could not create account for ${assignment.email}. They can be added later.`,
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error(`Error creating user ${assignment.email}:`, error);
        }
      }

      // Create role assignments (only for filled ones)
      const { error: rolesError } = await supabase
        .from('role_assignments')
        .insert(
          filledAssignments.map(assignment => ({
            practice_id: practice.id,
            role: assignment.role as any,
            assigned_name: assignment.name,
            assigned_email: assignment.email,
            user_id: assignment.role === 'practice_manager' ? user.id : null
          }))
        );

      if (rolesError) throw rolesError;

      // Mark setup as complete
      const { error: setupError } = await supabase
        .from('organization_setup')
        .insert({
          practice_id: practice.id,
          setup_completed: true
        });

      if (setupError) throw setupError;

      // Create standard process templates for the new practice
      await createStandardProcessTemplates(practice.id);

      toast({
        title: "Organization setup complete",
        description: "Your practice has been set up successfully with standard processes",
      });

      onComplete();
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: "Setup failed",
        description: error.message || "Failed to set up organization",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Organization Setup</CardTitle>
            <CardDescription>
              Set up your practice and assign roles to team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization/Practice Name</Label>
                <Input
                  id="orgName"
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Enter your practice name"
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Role Assignments</Label>
                  <div className="text-sm text-muted-foreground">
                    Assign people to roles (leave empty if not needed)
                  </div>
                </div>

                {roleAssignments.map((assignment, index) => {
                  const roleInfo = AVAILABLE_ROLES.find(r => r.value === assignment.role);
                  return (
                    <Card key={assignment.role} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                          <Label className="font-medium">{roleInfo?.label}</Label>
                          <div className="text-sm text-muted-foreground">
                            {assignment.role === 'practice_manager' && '(Required)'}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={assignment.name}
                            onChange={(e) => updateRoleAssignment(index, 'name', e.target.value)}
                            placeholder="Full name"
                            required={assignment.role === 'practice_manager'}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={assignment.email}
                            onChange={(e) => updateRoleAssignment(index, 'email', e.target.value)}
                            placeholder="email@example.com"
                            required={assignment.role === 'practice_manager'}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-end gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Setting up...' : 'Complete Setup'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}