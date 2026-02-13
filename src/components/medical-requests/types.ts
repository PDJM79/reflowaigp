import { z } from 'zod';

// Request types enum
export const REQUEST_TYPES = [
  { value: 'insurance', label: 'Insurance Form' },
  { value: 'medical_report', label: 'Medical Report' },
  { value: 'letter', label: 'GP Letter' },
  { value: 'copy_notes', label: 'Copy of Notes' },
  { value: 'solicitor_request', label: 'Solicitor Request' },
  { value: 'other', label: 'Other' },
] as const;

export type RequestType = typeof REQUEST_TYPES[number]['value'];
export type RequestStatus = 'received' | 'assigned' | 'in_progress' | 'sent';

// Main interface matching Supabase schema
export interface MedicalRequest {
  id: string;
  practice_id: string;
  request_type: string;
  status: string;
  received_at: string;
  assigned_gp_id: string | null;
  sent_at: string | null;
  notes: string | null;
  emis_hash: string | null;
  evidence_ids: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

// Form data for creating/editing requests
export interface MedicalRequestFormData {
  request_type: RequestType;
  received_at: string;
  emis_hash?: string;
  notes?: string;
}

// GP employee for assignment
export interface GPEmployee {
  id: string;
  name: string;
  role: string | null;
}

// Analytics metrics
export interface TurnaroundMetrics {
  averageDays: number;
  pendingOver7Days: number;
  totalReceived: number;
  totalCompleted: number;
  byType: Record<RequestType, number>;
  monthlyTrend: { month: string; count: number; avgDays: number }[];
}

// Enhanced validation schema
export const medicalRequestFormSchema = z.object({
  request_type: z.enum(['insurance', 'medical_report', 'letter', 'copy_notes', 'solicitor_request', 'other']),
  received_at: z.string().min(1, 'Date received is required'),
  emis_hash: z
    .string()
    .trim()
    .max(100, 'Reference must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .trim()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
});

export type MedicalRequestFormValues = z.infer<typeof medicalRequestFormSchema>;

// Filter state
export interface RequestFiltersState {
  status: RequestStatus | 'all';
  type: RequestType | 'all';
  dateFrom: string;
  dateTo: string;
  search: string;
}

// Calculate turnaround days
export function calculateTurnaroundDays(receivedAt: string, sentAt: string | null): number | null {
  if (!sentAt) return null;
  const received = new Date(receivedAt);
  const sent = new Date(sentAt);
  const diffTime = Math.abs(sent.getTime() - received.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Calculate days pending
export function calculateDaysPending(receivedAt: string): number {
  const received = new Date(receivedAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - received.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
