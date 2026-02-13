import { z } from 'zod';

// Auth schemas
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// User management schemas
export const createUserSchema = z.object({
  email: emailSchema,
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  roles: z.array(z.string()).min(1, 'At least one role is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

// Task schemas
export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .trim()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  due_at: z.string().datetime().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
});

// Incident schemas
export const incidentSchema = z.object({
  date_time: z.string().datetime('Invalid date/time'),
  location: z
    .string()
    .trim()
    .min(1, 'Location is required')
    .max(200, 'Location must be less than 200 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be less than 5000 characters'),
  incident_category: z.enum(['clinical', 'non_clinical', 'near_miss', 'medication_error', 'fall', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  witness_names: z.string().max(500).optional(),
});

// Complaint schemas
export const complaintSchema = z.object({
  date_received: z.string().datetime('Invalid date'),
  complainant_name: z
    .string()
    .trim()
    .max(200, 'Name must be less than 200 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(10000, 'Description must be less than 10000 characters'),
  channel: z.enum(['letter', 'email', 'phone', 'in_person', 'online', 'other']).optional(),
  category: z.string().max(100).optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
});

// Policy schemas
export const policySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(300, 'Title must be less than 300 characters'),
  category: z.string().max(100).optional(),
  version: z.string().max(20).optional(),
  review_date: z.string().optional(),
  file: z.instanceof(File).optional(),
});

// Fridge temperature schemas
export const fridgeTempSchema = z.object({
  temperature: z
    .number()
    .min(-10, 'Temperature must be at least -10°C')
    .max(25, 'Temperature must be at most 25°C'),
  recorded_at: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

// Training record schemas
export const trainingRecordSchema = z.object({
  training_type_id: z.string().uuid('Invalid training type'),
  completion_date: z.string(),
  expiry_date: z.string().optional(),
  certificate_number: z.string().max(100).optional(),
  provider: z.string().max(200).optional(),
});

// Fire safety action schemas
export const fireSafetyActionSchema = z.object({
  action_description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  timeframe: z.enum(['immediate', 'one_month', 'three_months', 'six_months', 'twelve_months']),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string(),
});

// IPC check schemas
export const ipcCheckSchema = z.object({
  area: z.string().min(1, 'Area is required').max(200),
  item: z.string().min(1, 'Item is required').max(500),
  response: z.enum(['yes', 'no', 'na']),
  comments: z.string().max(1000).optional(),
});

// Claims schemas
export const claimSchema = z.object({
  period_start: z.string(),
  period_end: z.string(),
  claim_type: z.string().max(100).optional(),
});

// Medical request schemas
export const medicalRequestSchema = z.object({
  request_type: z.enum(['insurance', 'medical_report', 'letter', 'copy_notes']),
  requester_name: z.string().trim().max(200).optional(),
  requester_organization: z.string().max(300).optional(),
  date_received: z.string(),
  notes: z.string().max(2000).optional(),
});

// Generic validation helper
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: boolean; 
  data?: T; 
  errors?: Record<string, string>;
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  
  return { success: false, errors };
}

// Sanitize HTML content (strip all tags for text fields)
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, '') // Remove HTML entities
    .trim();
}

// Validate and sanitize URL
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Rate limiting helper (client-side)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}
