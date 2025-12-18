import { Database } from '@/integrations/supabase/types';

// Database types
export type Fridge = Database['public']['Tables']['fridges']['Row'];
export type FridgeInsert = Database['public']['Tables']['fridges']['Insert'];
export type FridgeUpdate = Database['public']['Tables']['fridges']['Update'];

export type TempLog = Database['public']['Tables']['temp_logs']['Row'];
export type TempLogInsert = Database['public']['Tables']['temp_logs']['Insert'];
export type TempLogUpdate = Database['public']['Tables']['temp_logs']['Update'];

// Extended types with relations
export interface TempLogWithFridge extends TempLog {
  fridges: Pick<Fridge, 'name' | 'min_temp' | 'max_temp'> | null;
}

// Form data types
export interface NewFridgeFormData {
  name: string;
  location: string;
  min_temp: string;
  max_temp: string;
}

export interface NewLogFormData {
  fridge_id: string;
  reading: string;
  log_time: 'AM' | 'PM';
}

export interface RemedialActionFormData {
  remedial_action: string;
  outcome: string;
}

// Statistics types
export interface DailyComplianceStats {
  date: string;
  total: number;
  compliant: number;
  breaches: number;
  complianceRate: number;
}

export interface FridgeStats {
  fridgeId: string;
  fridgeName: string;
  totalLogs: number;
  breaches: number;
  complianceRate: number;
  avgTemperature: number;
}
