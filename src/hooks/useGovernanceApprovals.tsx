import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  PendingApprovalItem,
  ApprovalHistoryItem,
  ApprovalFilters,
  ApprovableEntityType,
} from '@/components/governance/types';

interface GovernanceStats {
  totalPending: number;
  pendingPolicies: number;
  pendingAssessments: number;
  approvedThisMonth: number;
}

export function useGovernanceApprovals(practiceId: string | null) {
  const { user } = useAuth();
  const [pendingItems, setPendingItems] = useState<PendingApprovalItem[]>([]);
  const [historyItems, setHistoryItems] = useState<ApprovalHistoryItem[]>([]);
  const [stats, setStats] = useState<GovernanceStats>({
    totalPending: 0,
    pendingPolicies: 0,
    pendingAssessments: 0,
    approvedThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ApprovalFilters>({
    entityTypes: [],
    dateRange: { from: null, to: null },
    decision: 'all',
  });

  const fetchPendingApprovals = useCallback(async () => {
    if (!practiceId) return;

    try {
      const res = await fetch(`/api/practices/${practiceId}/governance-approvals`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const all = await res.json() as any[];

      const items: PendingApprovalItem[] = all
        .filter((a) => (a.decision ?? a.decision) === 'pending')
        .map((approval) => ({
          id: approval.id,
          entityType: (approval.entityType ?? approval.entity_type) as ApprovableEntityType,
          entityId: approval.entityId ?? approval.entity_id,
          entityName: approval.entityName ?? approval.entity_name,
          requestedBy: approval.requestedBy ?? approval.requested_by,
          requestedByName: null,
          requestedAt: approval.requestedAt ?? approval.requested_at ?? new Date().toISOString(),
          urgency: ((approval.urgency) as 'high' | 'medium' | 'low') || 'medium',
          ownerId: approval.requestedBy ?? approval.requested_by,
          ownerName: null,
        }));

      setPendingItems(items);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    }
  }, [practiceId]);

  const fetchApprovalHistory = useCallback(async () => {
    if (!practiceId) return;

    try {
      const res = await fetch(`/api/practices/${practiceId}/governance-approvals`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const all = (await res.json() as any[]).map((h) => ({
        id: h.id,
        entityType: (h.entityType ?? h.entity_type) as ApprovableEntityType,
        entityName: h.entityName ?? h.entity_name,
        decision: (h.decision) as ApprovalHistoryItem['decision'],
        approvedBy: h.approvedBy ?? h.approved_by,
        approvedAt: h.approvedAt ?? h.approved_at,
        notes: h.approvalNotes ?? h.approval_notes,
        digitalSignature: h.digitalSignature ?? h.digital_signature,
        reviewerTitle: h.reviewerTitle ?? h.reviewer_title,
      }));

      let items = all.filter((h) => h.decision !== 'pending');
      if (filters.entityTypes.length > 0) items = items.filter((h) => filters.entityTypes.includes(h.entityType));
      if (filters.decision !== 'all') items = items.filter((h) => h.decision === filters.decision);
      if (filters.dateRange.from) items = items.filter((h) => h.approvedAt && new Date(h.approvedAt) >= filters.dateRange.from!);
      if (filters.dateRange.to) items = items.filter((h) => h.approvedAt && new Date(h.approvedAt) <= filters.dateRange.to!);
      items.sort((a, b) => new Date(b.approvedAt || 0).getTime() - new Date(a.approvedAt || 0).getTime());

      setHistoryItems(items.slice(0, 50).map((h) => ({
        ...h,
        approverName: null,
        approvedAt: h.approvedAt || new Date().toISOString(),
      })) as ApprovalHistoryItem[]);
    } catch (error) {
      console.error('Error fetching approval history:', error);
    }
  }, [practiceId, filters]);

  const fetchStats = useCallback(async () => {
    if (!practiceId) return;

    try {
      const res = await fetch(`/api/practices/${practiceId}/governance-approvals`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const all = (await res.json() as any[]).map((a) => ({
        entity_type: a.entityType ?? a.entity_type,
        decision: a.decision,
        approved_at: a.approvedAt ?? a.approved_at,
      }));

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const pending = all.filter((a) => a.decision === 'pending');
      const approvedThisMonth = all.filter((a) =>
        a.decision === 'approved' && a.approved_at && new Date(a.approved_at) >= startOfMonth).length;
      const pendingPolicies = pending.filter((p) => p.entity_type === 'policy').length;
      const pendingAssessments = pending.filter((p) =>
        ['fire_safety_assessment', 'ipc_audit', 'room_assessment'].includes(p.entity_type)).length;

      setStats({
        totalPending: pending.length,
        pendingPolicies,
        pendingAssessments,
        approvedThisMonth,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [practiceId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPendingApprovals(), fetchApprovalHistory(), fetchStats()]);
    setLoading(false);
  }, [fetchPendingApprovals, fetchApprovalHistory, fetchStats]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-fetch history when filters change
  useEffect(() => {
    fetchApprovalHistory();
  }, [fetchApprovalHistory]);

  return {
    pendingItems,
    historyItems,
    stats,
    loading,
    filters,
    setFilters,
    refresh,
  };
}
