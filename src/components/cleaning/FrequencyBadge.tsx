import { Badge } from "@/components/ui/badge";

interface FrequencyBadgeProps {
  frequency: 'full' | 'spot' | 'check' | 'periodic' | 'touch';
}

const frequencyConfig = {
  full: { label: 'Full Clean', className: 'bg-blue-100 text-blue-800' },
  spot: { label: 'Spot Clean', className: 'bg-green-100 text-green-800' },
  check: { label: 'Check Only', className: 'bg-yellow-100 text-yellow-800' },
  periodic: { label: 'Periodic', className: 'bg-purple-100 text-purple-800' },
  touch: { label: 'Touch Point', className: 'bg-orange-100 text-orange-800' }
};

export function FrequencyBadge({ frequency }: FrequencyBadgeProps) {
  const config = frequencyConfig[frequency];
  
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
