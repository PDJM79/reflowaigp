export type ApprovalDecision = 'pending' | 'approved' | 'rejected' | 'pending_changes';
export type ApprovalType = 'sign_off' | 'review' | 'audit';
export type ApprovableEntityType = 'policy' | 'fire_safety_assessment' | 'ipc_audit' | 'room_assessment' | 'claim_run';
export type ApprovalUrgency = 'high' | 'medium' | 'low';

export interface GovernanceApproval {
  id: string;
  practice_id: string;
  entity_type: ApprovableEntityType;
  entity_id: string;
  entity_name: string;
  approval_type: ApprovalType;
  decision: ApprovalDecision;
  requested_by: string | null;
  requested_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  digital_signature: string | null;
  reviewer_title: string | null;
  urgency: ApprovalUrgency;
  created_at: string;
  updated_at: string;
}

export interface PendingApprovalItem {
  id: string;
  entityType: ApprovableEntityType;
  entityId: string;
  entityName: string;
  requestedBy: string | null;
  requestedByName: string | null;
  requestedAt: string;
  urgency: ApprovalUrgency;
  ownerId: string | null;
  ownerName: string | null;
}

export interface ApprovalFilters {
  entityTypes: ApprovableEntityType[];
  dateRange: { from: Date | null; to: Date | null };
  decision: ApprovalDecision | 'all';
}

export interface ApprovalHistoryItem {
  id: string;
  entityType: ApprovableEntityType;
  entityName: string;
  decision: ApprovalDecision;
  approvedBy: string | null;
  approverName: string | null;
  approvedAt: string;
  notes: string | null;
  digitalSignature: string | null;
  reviewerTitle: string | null;
}

export const ENTITY_TYPE_LABELS: Record<ApprovableEntityType, string> = {
  policy: 'Policy',
  fire_safety_assessment: 'Fire Safety Assessment',
  ipc_audit: 'IPC Audit',
  room_assessment: 'Room Assessment',
  claim_run: 'Claim Run',
};

export const DECISION_LABELS: Record<ApprovalDecision, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  pending_changes: 'Changes Requested',
};

export const URGENCY_COLORS: Record<ApprovalUrgency, string> = {
  high: 'text-destructive',
  medium: 'text-warning',
  low: 'text-muted-foreground',
};
