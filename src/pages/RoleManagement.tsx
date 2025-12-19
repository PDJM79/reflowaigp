import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Shield, Users, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { RolePicker } from '@/components/roles/RolePicker';
import { CapabilityMatrix } from '@/components/roles/CapabilityMatrix';
import { useRoleCatalog } from '@/hooks/useRoleCatalog';
import { useCapabilities } from '@/hooks/useCapabilities';
import { RoleGate } from '@/components/auth/RoleGate';
import type { RoleCatalogEntry, Capability } from '@/types/roles';

interface CapabilityOverride {
  roleId: string;
  capability: Capability;
  enabled: boolean;
}

export default function RoleManagement() {
  const { hasCapability } = useCapabilities();
  const {
    roleCatalog,
    catalogLoading,
    practiceRoles,
    practiceRolesLoading,
    enableRole,
    disableRole,
    fetchPracticeRoles,
  } = useRoleCatalog();

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [capabilityOverrides, setCapabilityOverrides] = useState<CapabilityOverride[]>([]);
  const [activeTab, setActiveTab] = useState('roles');

  // Initialize selected roles from practice_roles
  useEffect(() => {
    const activeRoleIds = practiceRoles
      .filter(pr => pr.is_active)
      .map(pr => pr.role_catalog_id);
    setSelectedRoleIds(activeRoleIds);
  }, [practiceRoles]);

  // Get the selected role catalog entries for CapabilityMatrix
  const selectedRoles: RoleCatalogEntry[] = roleCatalog.filter(
    r => selectedRoleIds.includes(r.id)
  );

  const handleRoleSelectionChange = async (newSelectedIds: string[]) => {
    const previousIds = selectedRoleIds;
    setSelectedRoleIds(newSelectedIds);

    // Find roles to enable (newly selected)
    const toEnable = newSelectedIds.filter(id => !previousIds.includes(id));
    // Find roles to disable (deselected)
    const toDisable = previousIds.filter(id => !newSelectedIds.includes(id));

    for (const roleId of toEnable) {
      const result = await enableRole(roleId);
      if (!result.success) {
        toast.error(`Failed to enable role: ${result.error}`);
      }
    }

    for (const roleId of toDisable) {
      const practiceRole = practiceRoles.find(pr => pr.role_catalog_id === roleId);
      if (practiceRole) {
        const result = await disableRole(practiceRole.id);
        if (!result.success) {
          toast.error(`Failed to disable role: ${result.error}`);
        }
      }
    }

    if (toEnable.length > 0 || toDisable.length > 0) {
      toast.success('Practice roles updated');
    }
  };

  const handleOverridesChange = (overrides: CapabilityOverride[]) => {
    setCapabilityOverrides(overrides);
    // TODO: Persist overrides to practice_role_capabilities table
  };

  const loading = catalogLoading || practiceRolesLoading;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <RoleGate require="assign_roles" fallback={
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to manage roles.
          </AlertDescription>
        </Alert>
      </div>
    }>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BackButton />
              <h1 className="text-3xl font-bold">Role Management</h1>
            </div>
            <p className="text-muted-foreground">
              Configure which roles are available in your practice and customize their capabilities
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium">{selectedRoleIds.length}</span>
                <span className="text-muted-foreground">roles enabled</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">{roleCatalog.length}</span>
                <span className="text-muted-foreground">roles available</span>
              </div>
              {capabilityOverrides.length > 0 && (
                <Badge variant="secondary">
                  {capabilityOverrides.length} capability overrides
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Select Roles
            </TabsTrigger>
            <TabsTrigger value="capabilities" className="flex items-center gap-2" disabled={selectedRoleIds.length === 0}>
              <Settings className="h-4 w-4" />
              Configure Capabilities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="mt-6">
            <RolePicker
              selectedRoleIds={selectedRoleIds}
              onSelectionChange={handleRoleSelectionChange}
              showPcnRoles={true}
            />
          </TabsContent>

          <TabsContent value="capabilities" className="mt-6">
            {selectedRoles.length > 0 ? (
              <CapabilityMatrix
                roles={selectedRoles}
                overrides={capabilityOverrides}
                onOverridesChange={handleOverridesChange}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Roles Selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Select roles in the "Select Roles" tab first to configure their capabilities.
                  </p>
                  <Button onClick={() => setActiveTab('roles')}>
                    Select Roles
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
