import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ComplianceTagBadgeProps {
  standardIds: string[];
  variant?: "default" | "secondary" | "outline";
}

export function ComplianceTagBadge({ standardIds, variant = "secondary" }: ComplianceTagBadgeProps) {
  const { data: standards } = useQuery({
    queryKey: ['regulatory-standards', standardIds],
    queryFn: async () => {
      if (!standardIds || standardIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('regulatory_standards')
        .select(`
          *,
          regulatory_frameworks(framework_code, framework_name)
        `)
        .in('id', standardIds);

      if (error) throw error;
      return data;
    },
    enabled: standardIds && standardIds.length > 0,
  });

  if (!standards || standards.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {standards.map((standard) => (
        <TooltipProvider key={standard.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant={variant} className="text-xs cursor-help">
                {standard.regulatory_frameworks?.framework_code}:{standard.standard_code}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                <p className="font-semibold">{standard.standard_name}</p>
                <p className="text-xs text-muted-foreground">{standard.category}</p>
                {standard.description && (
                  <p className="text-xs mt-1">{standard.description}</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
