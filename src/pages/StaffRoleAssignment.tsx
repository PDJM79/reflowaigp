import React, { useState } from 'react';
import { BackButton } from '@/components/ui/back-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RoleGate } from '@/components/auth/RoleGate';
import { StaffRoleAssignmentTable } from '@/components/admin/StaffRoleAssignmentTable';
import { RoleCoverageCard } from '@/components/admin/RoleCoverageCard';
import { Settings, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type Capability } from '@/types/roles';

interface UserWithCapabilities {
  id: string;
  name: string;
  capabilities: Capability[];
}

export default function StaffRoleAssignment() {
  const [usersWithCapabilities, setUsersWithCapabilities] = useState<UserWithCapabilities[]>([]);

  return (
    <RoleGate 
      require="assign_roles" 
      fallback={
        <div className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                You don't have permission to manage staff roles.
              </p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold">Staff Role Assignment</h1>
              <p className="text-muted-foreground">
                Manage roles and permissions for staff members
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/role-management">
                <Settings className="h-4 w-4 mr-2" />
                Manage Roles
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/user-management">
                <Users className="h-4 w-4 mr-2" />
                User Management
              </Link>
            </Button>
          </div>
        </div>

        {/* Coverage Summary */}
        <RoleCoverageCard usersWithCapabilities={usersWithCapabilities} />

        {/* Staff Table */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Members</CardTitle>
            <CardDescription>
              View and edit role assignments for all staff members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StaffRoleAssignmentTable 
              onCapabilitiesChange={setUsersWithCapabilities}
            />
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  );
}
