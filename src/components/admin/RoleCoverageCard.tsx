import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CRITICAL_CAPABILITIES, CAPABILITY_LABELS, type Capability } from '@/types/roles';

interface UserWithCapabilities {
  id: string;
  name: string;
  capabilities: Capability[];
}

interface RoleCoverageCardProps {
  usersWithCapabilities: UserWithCapabilities[];
}

export function RoleCoverageCard({ usersWithCapabilities }: RoleCoverageCardProps) {
  // Calculate which critical capabilities are covered and by whom
  const capabilityCoverage = CRITICAL_CAPABILITIES.map(capability => {
    const coveredBy = usersWithCapabilities.filter(user => 
      user.capabilities.includes(capability)
    );
    return {
      capability,
      label: CAPABILITY_LABELS[capability] || capability,
      isCovered: coveredBy.length > 0,
      coveredBy: coveredBy.map(u => u.name),
    };
  });

  const uncoveredCount = capabilityCoverage.filter(c => !c.isCovered).length;
  const coveredCount = capabilityCoverage.filter(c => c.isCovered).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Critical Capability Coverage</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {coveredCount} covered
            </Badge>
            {uncoveredCount > 0 && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {uncoveredCount} uncovered
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {capabilityCoverage.map(({ capability, label, isCovered, coveredBy }) => (
            <div 
              key={capability} 
              className={`flex items-center justify-between p-2 rounded-md text-sm ${
                isCovered 
                  ? 'bg-green-50 dark:bg-green-950/30' 
                  : 'bg-amber-50 dark:bg-amber-950/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {isCovered ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
                <span className={isCovered ? 'text-foreground' : 'text-amber-800 dark:text-amber-200'}>
                  {label}
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                {isCovered ? coveredBy.join(', ') : 'No one assigned'}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
