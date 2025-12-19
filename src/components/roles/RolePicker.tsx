import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Users, Stethoscope, Building, Shield, Monitor, Wrench, Network } from 'lucide-react';
import { RoleCatalogEntry, RoleCategory, ROLE_CATEGORY_LABELS } from '@/types/roles';
import { supabase } from '@/integrations/supabase/client';

interface RolePickerProps {
  /** IDs of selected roles */
  selectedRoleIds: string[];
  /** Callback when role selection changes */
  onSelectionChange: (roleIds: string[]) => void;
  /** Whether to show PCN roles */
  showPcnRoles?: boolean;
  /** Read-only mode */
  disabled?: boolean;
}

const CATEGORY_ICONS: Record<RoleCategory, React.ReactNode> = {
  clinical: <Stethoscope className="h-4 w-4" />,
  admin: <Building className="h-4 w-4" />,
  governance: <Shield className="h-4 w-4" />,
  it: <Monitor className="h-4 w-4" />,
  support: <Wrench className="h-4 w-4" />,
  pcn: <Network className="h-4 w-4" />,
};

const CATEGORY_ORDER: RoleCategory[] = ['clinical', 'admin', 'governance', 'it', 'support', 'pcn'];

export function RolePicker({
  selectedRoleIds,
  onSelectionChange,
  showPcnRoles = true,
  disabled = false,
}: RolePickerProps) {
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<RoleCategory>>(
    new Set(['clinical', 'admin'])
  );

  useEffect(() => {
    fetchRoleCatalog();
  }, []);

  const fetchRoleCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('role_catalog')
        .select('*')
        .order('display_name');

      if (error) throw error;
      
      // Map the database response to our type
      const mappedData: RoleCatalogEntry[] = (data || []).map(role => ({
        ...role,
        category: role.category as RoleCategory,
        default_capabilities: (role.default_capabilities || []) as any[],
      }));
      
      setRoleCatalog(mappedData);
    } catch (error) {
      console.error('Error fetching role catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: RoleCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleRole = (roleId: string) => {
    if (disabled) return;
    
    if (selectedRoleIds.includes(roleId)) {
      onSelectionChange(selectedRoleIds.filter(id => id !== roleId));
    } else {
      onSelectionChange([...selectedRoleIds, roleId]);
    }
  };

  const selectAllInCategory = (category: RoleCategory) => {
    if (disabled) return;
    
    const categoryRoleIds = roleCatalog
      .filter(r => r.category === category)
      .map(r => r.id);
    
    const allSelected = categoryRoleIds.every(id => selectedRoleIds.includes(id));
    
    if (allSelected) {
      // Deselect all in category
      onSelectionChange(selectedRoleIds.filter(id => !categoryRoleIds.includes(id)));
    } else {
      // Select all in category
      const newSelection = [...new Set([...selectedRoleIds, ...categoryRoleIds])];
      onSelectionChange(newSelection);
    }
  };

  const rolesByCategory = CATEGORY_ORDER.reduce((acc, category) => {
    if (category === 'pcn' && !showPcnRoles) return acc;
    
    acc[category] = roleCatalog.filter(r => r.category === category);
    return acc;
  }, {} as Record<RoleCategory, RoleCatalogEntry[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <CardTitle>Select Practice Roles</CardTitle>
        </div>
        <CardDescription>
          Choose which roles are present in your practice. You can customize capabilities for each role later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{selectedRoleIds.length}</Badge>
          <span>roles selected</span>
        </div>

        {CATEGORY_ORDER.map(category => {
          if (category === 'pcn' && !showPcnRoles) return null;
          
          const roles = rolesByCategory[category] || [];
          if (roles.length === 0) return null;

          const selectedInCategory = roles.filter(r => selectedRoleIds.includes(r.id)).length;
          const isExpanded = expandedCategories.has(category);
          const allSelected = selectedInCategory === roles.length;

          return (
            <Collapsible
              key={category}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      {CATEGORY_ICONS[category]}
                      <span className="font-medium">{ROLE_CATEGORY_LABELS[category]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={selectedInCategory > 0 ? 'default' : 'secondary'}>
                        {selectedInCategory}/{roles.length}
                      </Badge>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t px-4 py-3 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Checkbox
                        id={`select-all-${category}`}
                        checked={allSelected}
                        onCheckedChange={() => selectAllInCategory(category)}
                        disabled={disabled}
                      />
                      <label
                        htmlFor={`select-all-${category}`}
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        Select all {ROLE_CATEGORY_LABELS[category].toLowerCase()} roles
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {roles.map(role => (
                        <div
                          key={role.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            selectedRoleIds.includes(role.id)
                              ? 'bg-primary/5 border-primary/20'
                              : 'hover:bg-muted/50'
                          } ${disabled ? 'opacity-60' : 'cursor-pointer'}`}
                          onClick={() => toggleRole(role.id)}
                        >
                          <Checkbox
                            checked={selectedRoleIds.includes(role.id)}
                            onCheckedChange={() => toggleRole(role.id)}
                            disabled={disabled}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{role.display_name}</div>
                            {role.description && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {role.description}
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {role.default_capabilities.length} capabilities
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
