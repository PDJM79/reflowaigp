// Phase 4 task-status vocabulary. `status` is free text on the tasks table; these
// are the known values the UI renders/filters. Shared by TaskCard, TasksList,
// Schedule, My Day and the Review Queue so the mapping lives in one place.

export type Rag = 'green' | 'amber' | 'red';

export interface TaskStatusMeta {
  label: string;
  rag: Rag;
  /** Tailwind classes for a solid status badge. */
  badgeClass: string;
}

export const TASK_STATUS_META: Record<string, TaskStatusMeta> = {
  pending: { label: 'Pending', rag: 'amber', badgeClass: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', rag: 'amber', badgeClass: 'bg-amber-500 text-white' },
  complete: { label: 'Complete', rag: 'green', badgeClass: 'bg-green-600 text-white' },
  closed: { label: 'Closed', rag: 'green', badgeClass: 'bg-green-600 text-white' },
  submitted_for_review: { label: 'Submitted for review', rag: 'amber', badgeClass: 'bg-blue-600 text-white' },
  rejected: { label: 'Rejected', rag: 'red', badgeClass: 'bg-destructive text-destructive-foreground' },
  overdue: { label: 'Overdue', rag: 'red', badgeClass: 'bg-destructive text-destructive-foreground' },
  missed: { label: 'Missed', rag: 'red', badgeClass: 'bg-neutral-500 text-white' },
};

const DEFAULT_META: TaskStatusMeta = { label: 'Pending', rag: 'amber', badgeClass: 'bg-muted text-muted-foreground' };

export function statusMeta(status: string | null | undefined): TaskStatusMeta {
  return (status && TASK_STATUS_META[status]) || DEFAULT_META;
}

export function statusLabel(status: string | null | undefined): string {
  return statusMeta(status).label;
}

/** Statuses that count as "done" (out of active/overdue queues). */
export const COMPLETED_STATUSES = new Set(['complete', 'closed']);

export function isCompletedStatus(status: string | null | undefined): boolean {
  return !!status && COMPLETED_STATUSES.has(status);
}

/** A task is effectively overdue if flagged so, or unfinished and past its due date. */
export function isEffectivelyOverdue(status: string | null | undefined, dueAt?: string | Date | null): boolean {
  if (status === 'overdue' || status === 'missed') return true;
  if (isCompletedStatus(status) || status === 'submitted_for_review') return false;
  if (!dueAt) return false;
  return new Date(dueAt).getTime() < Date.now();
}

/** Options for status filter dropdowns. */
export const TASK_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'submitted_for_review', label: 'Submitted for review' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'missed', label: 'Missed' },
  { value: 'complete', label: 'Complete' },
  { value: 'closed', label: 'Closed' },
];
