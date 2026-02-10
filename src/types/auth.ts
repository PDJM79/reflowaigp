export type UserRole = 'practice_manager' | 'gp' | 'nurse' | 'administrator' | 'nurse_lead' | 'cd_lead_gp' | 'estates_lead' | 'ig_lead' | 'reception_lead' | 'hca' | 'reception' | 'auditor' | 'cleaner';

export interface RoleAssignment {
  role: string;
  name: string;
  email: string;
  password: string;
}

// Note: User roles are now stored in the user_roles table for security
// The 'role' field has been removed from the users table to prevent privilege escalation

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
  { value: 'estates_lead', label: 'Estates Lead' },
  { value: 'ig_lead', label: 'IG Lead' },
  { value: 'hca', label: 'Healthcare Assistant' },
  { value: 'reception_lead', label: 'Reception Lead' },
  { value: 'reception', label: 'Reception' },
  { value: 'cleaner', label: 'Cleaner' },
] as const;