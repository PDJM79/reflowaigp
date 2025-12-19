import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Pencil, Loader2 } from 'lucide-react';
import { ROLE_CATEGORY_LABELS, type RoleCategory } from '@/types/roles';

interface RoleCatalogEntry {
  id: string;
  role_key: string;
  display_name: string;
  category: string;
  default_capabilities: string[];
}

interface PracticeRole {
  id: string;
  role_catalog_id: string;
  role_catalog?: RoleCatalogEntry;
}

interface RoleAssignmentPopoverProps {
  userName: string;
  currentRoleIds: string[];
  availableRoles: PracticeRole[];
  onSave: (roleIds: string[]) => Promise<void>;
  disabled?: boolean;
}

export function RoleAssignmentPopover({
  userName,
  currentRoleIds,
  availableRoles,
  onSave,
  disabled = false,
}: RoleAssignmentPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(currentRoleIds);
  const [saving, setSaving] = useState(false);

  // Reset selection when popover opens
  useEffect(() => {
    if (open) {
      setSelectedRoleIds(currentRoleIds);
    }
  }, [open, currentRoleIds]);

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedRoleIds);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify([...selectedRoleIds].sort()) !== JSON.stringify([...currentRoleIds].sort());

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'clinical': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'admin': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'governance': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'it': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'support': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pcn': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Group roles by category
  const rolesByCategory = availableRoles.reduce((acc, role) => {
    const category = (role.role_catalog?.category || 'admin') as string;
    if (!acc[category]) acc[category] = [];
    acc[category].push(role);
    return acc;
  }, {} as Record<string, PracticeRole[]>);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled}>
          <Pencil className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="font-medium text-sm">
            Assign Roles to {userName}
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-4">
            {Object.entries(rolesByCategory).map(([category, roles]) => (
              <div key={category} className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {ROLE_CATEGORY_LABELS[category as RoleCategory] || category}
                </div>
                {roles.map(role => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={role.id}
                      checked={selectedRoleIds.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    <label
                      htmlFor={role.id}
                      className="text-sm cursor-pointer flex items-center gap-2"
                    >
                      {role.role_catalog?.display_name || 'Unknown Role'}
                      <Badge variant="outline" className={`text-xs ${getCategoryColor(category)}`}>
                        {role.role_catalog?.default_capabilities?.length || 0}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={saving || !hasChanges}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
