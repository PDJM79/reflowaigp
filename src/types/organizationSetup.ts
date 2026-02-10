// Types for enhanced organization setup with multi-role support and task scheduling

export interface RoleEmailAssignment {
  email: string;
  name: string;
  password: string;
  roles: string[]; // Array of role values
}

export interface TaskScheduleConfig {
  templateId?: string;
  templateName: string;
  responsibleRole: string;
  assignedTo: string;
  frequency: 'twice_daily' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  startDate: string;
  slaHours: number;
}

export interface OrganizationSetupData {
  organizationName: string;
  roleAssignments: RoleEmailAssignment[];
  taskSchedules: TaskScheduleConfig[];
}

export const FREQUENCY_OPTIONS = [
  { value: 'twice_daily', label: '2 per day' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
] as const;

export const DEFAULT_TASK_TEMPLATES = [
  {
    name: 'Fridge Temperature Check',
    responsible_role: 'nurse',
    default_frequency: 'twice_daily' as const,
    default_sla_hours: 4,
  },
  {
    name: 'Daily Equipment Check',
    responsible_role: 'gp',
    default_frequency: 'daily' as const,
    default_sla_hours: 24,
  },
  {
    name: 'Patient Safety Review',
    responsible_role: 'nurse',
    default_frequency: 'weekly' as const,
    default_sla_hours: 48,
  },
  {
    name: 'Weekly Staff Training Review',
    responsible_role: 'administrator',
    default_frequency: 'weekly' as const,
    default_sla_hours: 72,
  },
  {
    name: 'Monthly Clinical Audit',
    responsible_role: 'administrator',
    default_frequency: 'monthly' as const,
    default_sla_hours: 168, // 7 days
  },
  {
    name: 'Monthly Infection Control Audit',
    responsible_role: 'nurse_lead',
    default_frequency: 'monthly' as const,
    default_sla_hours: 72,
  },
  {
    name: 'Weekly Clinical Governance Review',
    responsible_role: 'cd_lead_gp',
    default_frequency: 'weekly' as const,
    default_sla_hours: 48,
  },
  {
    name: 'Daily Reception Procedures',
    responsible_role: 'reception_lead',
    default_frequency: 'daily' as const,
    default_sla_hours: 24,
  },
];