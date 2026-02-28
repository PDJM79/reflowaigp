import React from "react";
import { Stethoscope, Users, Toilet, Coffee, Briefcase, Home, Warehouse } from "lucide-react";

interface ZoneTypeIconProps {
  type: string | null;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  clinical: Stethoscope,
  waiting: Users,
  toilet: Toilet,
  staff: Coffee,
  office: Briefcase,
  kitchen: Home,
  corridor: Warehouse,
  other: Warehouse,
};

export function ZoneTypeIcon({ type, className = "h-5 w-5" }: ZoneTypeIconProps) {
  const Icon = (type && iconMap[type]) || iconMap.other;
  return <Icon className={className} />;
}
