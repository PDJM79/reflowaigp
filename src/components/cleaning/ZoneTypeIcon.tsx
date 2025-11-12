import { Stethoscope, Users, Toilet, Coffee, Briefcase, Home, Warehouse } from "lucide-react";

interface ZoneTypeIconProps {
  type: 'clinical' | 'waiting' | 'toilet' | 'staff' | 'office' | 'kitchen' | 'corridor' | 'other';
  className?: string;
}

const iconMap = {
  clinical: Stethoscope,
  waiting: Users,
  toilet: Toilet,
  staff: Coffee,
  office: Briefcase,
  kitchen: Home,
  corridor: Warehouse,
  other: Warehouse
};

export function ZoneTypeIcon({ type, className = "h-5 w-5" }: ZoneTypeIconProps) {
  const Icon = iconMap[type];
  return <Icon className={className} />;
}
