import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ComplianceTagBadgeProps {
  standardIds: string[];
  variant?: "default" | "secondary" | "outline";
}

export function ComplianceTagBadge({ standardIds, variant = "secondary" }: ComplianceTagBadgeProps) {
  if (!standardIds || standardIds.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {standardIds.map((id) => (
        <TooltipProvider key={id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={variant} className="text-xs cursor-help">
                Standard
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                <p className="font-semibold">Compliance Standard</p>
                <p className="text-xs text-muted-foreground">ID: {id}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
