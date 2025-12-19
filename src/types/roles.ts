// Role Catalog System Types
// Aligned with database schema for GP surgery role management

// All 37 capabilities as defined in the database
export type Capability =
  // Core reading/ack
  | 'view_policies'
  | 'ack_policies'
  // Governance & documents
  | 'manage_policies'
  | 'approve_policies'
  | 'manage_redactions'
  // Operations
  | 'manage_cleaning'
  | 'complete_cleaning'
  | 'manage_ipc'
  | 'run_ipc_audit'
  | 'manage_fire'
  | 'run_fire_checks'
  | 'manage_hs'
  | 'run_risk_assessment'
  | 'manage_rooms'
  | 'run_room_assessment'
  // Workforce
  | 'manage_training'
  | 'view_training'
  | 'upload_certificate'
  | 'manage_appraisals'
  | 'run_appraisal'
  | 'collect_360'
  // Patient-safety ops
  | 'report_incident'
  | 'manage_incident'
  | 'log_complaint'
  | 'manage_complaint'
  // Business ops
  | 'record_script'
  | 'manage_claims'
  | 'manage_medical_requests'
  | 'manage_fridges'
  | 'record_fridge_temp'
  // Data & reporting
  | 'manage_qof'
  | 'run_reports'
  | 'view_dashboards'
  // Administration
  | 'manage_users'
  | 'assign_roles'
  | 'configure_practice'
  | 'configure_notifications';

// All capabilities as an array for validation
export const ALL_CAPABILITIES: Capability[] = [
  'view_policies', 'ack_policies', 'manage_policies', 'approve_policies', 'manage_redactions',
  'manage_cleaning', 'complete_cleaning', 'manage_ipc', 'run_ipc_audit', 'manage_fire', 'run_fire_checks',
  'manage_hs', 'run_risk_assessment', 'manage_rooms', 'run_room_assessment',
  'manage_training', 'view_training', 'upload_certificate', 'manage_appraisals', 'run_appraisal', 'collect_360',
  'report_incident', 'manage_incident', 'log_complaint', 'manage_complaint',
  'record_script', 'manage_claims', 'manage_medical_requests', 'manage_fridges', 'record_fridge_temp',
  'manage_qof', 'run_reports', 'view_dashboards', 'manage_users', 'assign_roles', 'configure_practice', 'configure_notifications'
];

// Capability categories for UI grouping
export const CAPABILITY_CATEGORIES = {
  'Core': ['view_policies', 'ack_policies'] as Capability[],
  'Governance': ['manage_policies', 'approve_policies', 'manage_redactions'] as Capability[],
  'Operations': ['manage_cleaning', 'complete_cleaning', 'manage_ipc', 'run_ipc_audit', 'manage_fire', 'run_fire_checks', 'manage_hs', 'run_risk_assessment', 'manage_rooms', 'run_room_assessment'] as Capability[],
  'Workforce': ['manage_training', 'view_training', 'upload_certificate', 'manage_appraisals', 'run_appraisal', 'collect_360'] as Capability[],
  'Patient Safety': ['report_incident', 'manage_incident', 'log_complaint', 'manage_complaint'] as Capability[],
  'Business': ['record_script', 'manage_claims', 'manage_medical_requests', 'manage_fridges', 'record_fridge_temp'] as Capability[],
  'Data': ['manage_qof', 'run_reports', 'view_dashboards'] as Capability[],
  'Administration': ['manage_users', 'assign_roles', 'configure_practice', 'configure_notifications'] as Capability[],
} as const;

// Human-readable labels for capabilities
export const CAPABILITY_LABELS: Record<Capability, string> = {
  view_policies: 'View Policies',
  ack_policies: 'Acknowledge Policies',
  manage_policies: 'Manage Policies',
  approve_policies: 'Approve Policies',
  manage_redactions: 'Manage Redactions',
  manage_cleaning: 'Manage Cleaning',
  complete_cleaning: 'Complete Cleaning Tasks',
  manage_ipc: 'Manage IPC',
  run_ipc_audit: 'Run IPC Audits',
  manage_fire: 'Manage Fire Safety',
  run_fire_checks: 'Run Fire Checks',
  manage_hs: 'Manage Health & Safety',
  run_risk_assessment: 'Run Risk Assessments',
  manage_rooms: 'Manage Rooms',
  run_room_assessment: 'Run Room Assessments',
  manage_training: 'Manage Training',
  view_training: 'View Training',
  upload_certificate: 'Upload Certificates',
  manage_appraisals: 'Manage Appraisals',
  run_appraisal: 'Run Appraisals',
  collect_360: 'Collect 360 Feedback',
  report_incident: 'Report Incidents',
  manage_incident: 'Manage Incidents',
  log_complaint: 'Log Complaints',
  manage_complaint: 'Manage Complaints',
  record_script: 'Record Scripts',
  manage_claims: 'Manage Claims',
  manage_medical_requests: 'Manage Medical Requests',
  manage_fridges: 'Manage Fridges',
  record_fridge_temp: 'Record Fridge Temps',
  manage_qof: 'Manage QOF',
  run_reports: 'Run Reports',
  view_dashboards: 'View Dashboards',
  manage_users: 'Manage Users',
  assign_roles: 'Assign Roles',
  configure_practice: 'Configure Practice',
  configure_notifications: 'Configure Notifications',
};

// Role categories
export type RoleCategory = 'clinical' | 'admin' | 'governance' | 'it' | 'support' | 'pcn';

export const ROLE_CATEGORY_LABELS: Record<RoleCategory, string> = {
  clinical: 'Clinical',
  admin: 'Administrative',
  governance: 'Governance',
  it: 'IT & Systems',
  support: 'Support',
  pcn: 'PCN (Primary Care Network)',
};

// Role catalog entry from database
export interface RoleCatalogEntry {
  id: string;
  role_key: string;
  display_name: string;
  category: RoleCategory;
  default_capabilities: Capability[];
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Practice-specific role configuration
export interface PracticeRole {
  id: string;
  practice_id: string;
  role_catalog_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role_catalog?: RoleCatalogEntry;
}

// Capability override for a practice role
export interface PracticeRoleCapability {
  id: string;
  practice_role_id: string;
  capability: Capability;
  created_at: string;
}

// User's assigned practice roles
export interface UserPracticeRole {
  id: string;
  practice_id: string;
  user_id: string;
  practice_role_id: string;
  created_at: string;
  updated_at: string;
  practice_role?: PracticeRole;
}

// Extended practice role with full details
export interface PracticeRoleWithDetails extends PracticeRole {
  role_catalog: RoleCatalogEntry;
  capability_overrides: PracticeRoleCapability[];
  effective_capabilities: Capability[];
}

// User with their roles and capabilities
export interface UserWithRoles {
  user_id: string;
  practice_roles: PracticeRoleWithDetails[];
  capabilities: Capability[];
}

// Critical capabilities that should always have an assignee
export const CRITICAL_CAPABILITIES: Capability[] = [
  'manage_cleaning',
  'manage_claims',
  'manage_complaint',
  'manage_fridges',
  'manage_policies',
  'manage_ipc',
];

// Check if a capability is in a list
export function hasCapability(capabilities: Capability[], required: Capability | Capability[], requireAll = false): boolean {
  const requiredCaps = Array.isArray(required) ? required : [required];
  
  if (requireAll) {
    return requiredCaps.every(cap => capabilities.includes(cap));
  }
  
  return requiredCaps.some(cap => capabilities.includes(cap));
}
