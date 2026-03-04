// ── Shared types for the Onboarding Wizard ───────────────────────────────────
// Used by the orchestrator and all step components to ensure type consistency.

export interface CqcRating {
  overall: string | null;
  safe: string | null;
  effective: string | null;
  caring: string | null;
  responsive: string | null;
  wellLed: string | null;
}

export interface InspectionData {
  source: 'cqc' | 'manual';
  lastInspectionDate: string | null;   // ISO date string
  rating: CqcRating;
  registrationStatus?: string;
  keyFindings?: string;                // free-text for manual entry
  fetchedAt?: string;                  // ISO timestamp when pulled from CQC
}

export interface PracticeLookupResult {
  locationId: string;
  name: string;
  address: string;
  postcode: string;
  lastInspectionDate: string | null;
  registrationStatus: string;
  rating: CqcRating;
  providerName: string | null;
}

// Record<moduleId, enabled>
export type ModuleSelections = Record<string, boolean>;

// All state accumulated across wizard steps
export interface WizardState {
  regulator: 'cqc' | 'hiw';
  inspectionData: InspectionData | null;
  modules: ModuleSelections;
}

export interface ComplianceTemplate {
  id: string;
  moduleName: string;
  category: string;
  title: string;
  description: string | null;
  frequency: string;
  isMandatory: boolean;
  regulator: string | null;
  sortOrder: number;
}

// Dynamic step configuration — 7 steps if cleaning on, 5 if off
export interface StepConfig {
  total: number;
  labels: string[];
}

export function getStepConfig(modules: ModuleSelections): StepConfig {
  const cleaningOn = modules['cleaning'] !== false;
  return cleaningOn
    ? { total: 7, labels: ['Practice', 'Modules', 'Inspection', 'Compliance', 'Rooms', 'Cleaning', 'Review'] }
    : { total: 5, labels: ['Practice', 'Modules', 'Inspection', 'Compliance', 'Review'] };
}
