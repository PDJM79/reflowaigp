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

// ── Room / Zone types ─────────────────────────────────────────────────────────
export type RoomType = 'consultation' | 'bathroom' | 'waiting_room' | 'staff_area' | 'kitchen' | 'utility' | 'custom';
export type ZoneType = 'patient' | 'staff' | 'utility' | 'clinical';

export interface Room {
  id: string;            // client-side key only — not persisted
  name: string;          // user-editable, max 100 chars
  type: RoomType;
  zone: ZoneType;
  customType?: string;   // only when type === 'custom'
}

// ── Cleaning schedule types ───────────────────────────────────────────────────
export type CleaningFrequency = '2x_daily' | 'daily' | 'every_other_day' | 'weekly' | 'fortnightly' | 'monthly';

export interface CleaningTemplate {
  id: string;
  roomType: string;      // matches cleaning_templates.room_type in DB
  taskName: string;
  frequency: string;     // raw DB value — normalized to CleaningFrequency in component
  isMandatory: boolean;
  sortOrder: number;
}

export interface TaskConfig {
  templateId: string;
  taskName: string;      // display only — not persisted
  frequency: CleaningFrequency;
  requiresPhoto: boolean;
}

// All state accumulated across wizard steps
export interface WizardState {
  regulator: 'cqc' | 'hiw';
  inspectionData: InspectionData | null;
  modules: ModuleSelections;
  rooms: Room[];
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

// ── AI Recommendations (Step 7) ───────────────────────────────────────────────
export interface FocusArea  { task: string; reason: string; deadline: string; category: string; }
export interface QuickWin   { task: string; reason: string; timeEstimate: string; }
export interface AIPriorities {
  focusAreas:     FocusArea[];
  quickWins:      QuickWin[];
  ongoingSummary: { weeklyTasks: number; monthlyTasks: number; annualTasks: number; totalRooms: number; cleaningTasksPerDay: number; };
  personalNote:   string;
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
