import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
      // Fetch pending governance approvals
      const { data: pendingApprovals, error } = await supabase
        .from('governance_approvals')
        .select(`
          id,
          entity_type,
          entity_id,
          entity_name,
          requested_by,
          requested_at,
          urgency
        `)
        .eq('practice_id', practiceId)
        .eq('decision', 'pending')
        .order('urgency', { ascending: true })
        .order('requested_at', { ascending: true });

      if (error) throw error;

      // Transform to PendingApprovalItem format
      const items: PendingApprovalItem[] = (pendingApprovals || []).map((approval) => ({
        id: approval.id,
        entityType: approval.entity_type as ApprovableEntityType,
        entityId: approval.entity_id,
        entityName: approval.entity_name,
        requestedBy: approval.requested_by,
        requestedByName: null, // Could be joined if needed
        requestedAt: approval.requested_at || new Date().toISOString(),
        urgency: (approval.urgency as 'high' | 'medium' | 'low') || 'medium',
        ownerId: approval.requested_by,
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
      let query = supabase
        .from('governance_approvals')
        .select(`
          id,
          entity_type,
          entity_name,
          decision,
          approved_by,
          approved_at,
          approval_notes,
          digital_signature,
          reviewer_title
        `)
        .eq('practice_id', practiceId)
        .neq('decision', 'pending')
        .order('approved_at', { ascending: false })
        .limit(50);

      // Apply filters
      if (filters.entityTypes.length > 0) {
        query = query.in('entity_type', filters.entityTypes);
      }

      if (filters.decision !== 'all') {
        query = query.eq('decision', filters.decision);
      }

      if (filters.dateRange.from) {
        query = query.gte('approved_at', filters.dateRange.from.toISOString());
      }

      if (filters.dateRange.to) {
        query = query.lte('approved_at', filters.dateRange.to.toISOString());
      }

      const { data: history, error } = await query;

      if (error) throw error;

      const items: ApprovalHistoryItem[] = (history || []).map((h) => ({
        id: h.id,
        entityType: h.entity_type as ApprovableEntityType,
        entityName: h.entity_name,
        decision: h.decision as ApprovalHistoryItem['decision'],
        approvedBy: h.approved_by,
        approverName: null, // Could be joined if needed
        approvedAt: h.approved_at || new Date().toISOString(),
        notes: h.approval_notes,
        digitalSignature: h.digital_signature,
        reviewerTitle: h.reviewer_title,
      }));

      setHistoryItems(items);
    } catch (error) {
      console.error('Error fetching approval history:', error);
    }
  }, [practiceId, filters]);

  const fetchStats = useCallback(async () => {
    if (!practiceId) return;

    try {
      // Count pending by type
      const { data: pending, error: pendingError } = await supabase
        .from('governance_approvals')
        .select('entity_type')
        .eq('practice_id', practiceId)
        .eq('decision', 'pending');

      if (pendingError) throw pendingError;

      // Count approved this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: approvedCount, error: approvedError } = await supabase
        .from('governance_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('practice_id', practiceId)
        .eq('decision', 'approved')
        .gte('approved_at', startOfMonth.toISOString());

      if (approvedError) throw approvedError;

      const pendingPolicies = (pending || []).filter((p) => p.entity_type === 'policy').length;
      const pendingAssessments = (pending || []).filter((p) =>
        ['fire_safety_assessment', 'ipc_audit', 'room_assessment'].includes(p.entity_type)
      ).length;

      setStats({
        totalPending: (pending || []).length,
        pendingPolicies,
        pendingAssessments,
        approvedThisMonth: approvedCount || 0,
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
