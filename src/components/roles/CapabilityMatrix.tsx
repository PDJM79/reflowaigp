import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RoleCatalogEntry,
  Capability,
  CAPABILITY_CATEGORIES,
  CAPABILITY_LABELS,
  CRITICAL_CAPABILITIES,
} from '@/types/roles';

interface CapabilityOverride {
  roleId: string;
  capability: Capability;
  enabled: boolean;
}

interface CapabilityMatrixProps {
  /** Roles to configure capabilities for */
  roles: RoleCatalogEntry[];
  /** Current capability overrides (additions/removals from defaults) */
  overrides: CapabilityOverride[];
  /** Callback when overrides change */
  onOverridesChange: (overrides: CapabilityOverride[]) => void;
  /** Whether in read-only mode */
  disabled?: boolean;
}

export function CapabilityMatrix({
  roles,
  overrides,
  onOverridesChange,
  disabled = false,
}: CapabilityMatrixProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    roles.length > 0 ? roles[0].id : null
  );

  useEffect(() => {
    if (roles.length > 0 && !roles.find(r => r.id === selectedRoleId)) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  const getEffectiveCapabilities = (role: RoleCatalogEntry): Set<Capability> => {
    const effective = new Set<Capability>(role.default_capabilities);
    
    // Apply overrides
    overrides
      .filter(o => o.roleId === role.id)
      .forEach(override => {
        if (override.enabled) {
          effective.add(override.capability);
        } else {
          effective.delete(override.capability);
        }
      });
    
    return effective;
  };

  const isCapabilityEnabled = (role: RoleCatalogEntry, cap: Capability): boolean => {
    const override = overrides.find(o => o.roleId === role.id && o.capability === cap);
    if (override) {
      return override.enabled;
    }
    return role.default_capabilities.includes(cap);
  };

  const isOverridden = (role: RoleCatalogEntry, cap: Capability): boolean => {
    return overrides.some(o => o.roleId === role.id && o.capability === cap);
  };

  const toggleCapability = (role: RoleCatalogEntry, cap: Capability) => {
    if (disabled) return;

    const currentlyEnabled = isCapabilityEnabled(role, cap);
    const isDefault = role.default_capabilities.includes(cap);
    const newEnabled = !currentlyEnabled;

    // If new state matches default, remove override
    if (newEnabled === isDefault) {
      onOverridesChange(
        overrides.filter(o => !(o.roleId === role.id && o.capability === cap))
      );
    } else {
      // Add or update override
      const existingIndex = overrides.findIndex(
        o => o.roleId === role.id && o.capability === cap
      );
      
      if (existingIndex >= 0) {
        const newOverrides = [...overrides];
        newOverrides[existingIndex] = { ...newOverrides[existingIndex], enabled: newEnabled };
        onOverridesChange(newOverrides);
      } else {
        onOverridesChange([
          ...overrides,
          { roleId: role.id, capability: cap, enabled: newEnabled },
        ]);
      }
    }
  };

  const resetToDefaults = (role: RoleCatalogEntry) => {
    if (disabled) return;
    onOverridesChange(overrides.filter(o => o.roleId !== role.id));
  };

  // Check for missing critical capabilities across all roles
  const getMissingCriticalCapabilities = (): Capability[] => {
    const allEffective = new Set<Capability>();
    roles.forEach(role => {
      getEffectiveCapabilities(role).forEach(cap => allEffective.add(cap));
    });
    
    return CRITICAL_CAPABILITIES.filter(cap => !allEffective.has(cap));
  };

  const missingCritical = getMissingCriticalCapabilities();

  if (roles.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Select roles first to configure their capabilities.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle>Configure Role Capabilities</CardTitle>
        </div>
        <CardDescription>
          Customize which capabilities each role has. Changes from defaults are highlighted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingCritical.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> No role has the following critical capabilities:{' '}
              {missingCritical.map(cap => CAPABILITY_LABELS[cap]).join(', ')}.
              Consider assigning these to at least one role.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={selectedRoleId || ''} onValueChange={setSelectedRoleId}>
          <ScrollArea className="w-full">
            <TabsList className="w-full justify-start flex-nowrap">
              {roles.map(role => {
                const overrideCount = overrides.filter(o => o.roleId === role.id).length;
                return (
                  <TabsTrigger
                    key={role.id}
                    value={role.id}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    {role.display_name}
                    {overrideCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {overrideCount} modified
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>

          {roles.map(role => (
            <TabsContent key={role.id} value={role.id} className="mt-4">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{role.display_name}</h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                  {overrides.filter(o => o.roleId === role.id).length > 0 && !disabled && (
                    <button
                      onClick={() => resetToDefaults(role)}
                      className="text-sm text-primary hover:underline"
                    >
                      Reset to defaults
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {Object.entries(CAPABILITY_CATEGORIES).map(([category, caps]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {caps.map(cap => {
                          const enabled = isCapabilityEnabled(role, cap);
                          const overridden = isOverridden(role, cap);
                          const isDefault = role.default_capabilities.includes(cap);
                          const isCritical = CRITICAL_CAPABILITIES.includes(cap);

                          return (
                            <div
                              key={cap}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                overridden
                                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                                  : enabled
                                  ? 'bg-primary/5 border-primary/20'
                                  : 'hover:bg-muted/50'
                              } ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
                              onClick={() => toggleCapability(role, cap)}
                            >
                              <Checkbox
                                checked={enabled}
                                onCheckedChange={() => toggleCapability(role, cap)}
                                disabled={disabled}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {CAPABILITY_LABELS[cap]}
                                  </span>
                                  {isCritical && (
                                    <Badge variant="outline" className="text-xs">
                                      Critical
                                    </Badge>
                                  )}
                                </div>
                                {overridden && (
                                  <span className="text-xs text-amber-600 dark:text-amber-400">
                                    {isDefault ? 'Removed from default' : 'Added to default'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-primary/20 border border-primary/40" />
                      <span>Enabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700" />
                      <span>Modified from default</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
