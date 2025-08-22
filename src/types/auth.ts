export interface RoleAssignment {
  role: string;
  name: string;
  email: string;
}

export interface OrganizationSetup {
  organizationName: string;
  roleAssignments: RoleAssignment[];
}

export const AVAILABLE_ROLES = [
  { value: 'practice_manager', label: 'Practice Manager' },
  { value: 'administrator', label: 'Administrator' },
  { value: 'nurse_lead', label: 'Nurse Lead' },
  { value: 'cd_lead_gp', label: 'CD Lead GP' },
  { value: 'gp', label: 'GP' },
  { value: 'nurse', label: 'Practice Nurse' },
  { value: 'hca', label: 'Healthcare Assistant' },
  { value: 'reception_lead', label: 'Reception Lead' },
  { value: 'reception', label: 'Reception' },
] as const;