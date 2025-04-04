'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { PendingApprovals } from '@/types/approvals';

interface UpdateOrganizationParams {
  organizationId: string;
  organizationType: 'sponsor' | 'issuer' | 'exchange';
  newStatus: 'approved' | 'rejected';
  reason?: string;
}

interface ApprovalContextType {
  // Core state
  loading: boolean;
  error: Error | null;
  pendingApprovals: PendingApprovals;

  // Approval actions
  updateOrganizationStatus: (params: UpdateOrganizationParams) => Promise<void>;

  // Fetch functions
  fetchPendingApprovals: () => Promise<void>;
}

const ApprovalContext = createContext<ApprovalContextType | undefined>(undefined);

export function ApprovalProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovals>({
    sponsors: [],
    issuers: [],
    exchanges: [],
  });
  const supabase = createClientComponentClient();

  const updateOrganizationStatus = useCallback(async (params: UpdateOrganizationParams) => {
    setLoading(true);
    setError(null);
    
    try {
      // Update organization status
      const tableName = `${params.organizationType}s`; // sponsors, issuers, exchanges
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ status: params.newStatus })
        .eq('id', params.organizationId);

      if (updateError) throw updateError;

      // Record in approval history
      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          organization_id: params.organizationId,
          organization_type: params.organizationType,
          new_status: params.newStatus,
          reason: params.reason,
        });

      if (historyError) throw historyError;

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const fetchPendingApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch pending approvals from all organization types
      const [sponsors, issuers, exchanges] = await Promise.all([
        supabase.from('sponsors').select('*').eq('status', 'pending'),
        supabase.from('issuers').select('*').eq('status', 'pending'),
        supabase.from('exchanges').select('*').eq('status', 'pending'),
      ]);

      // Handle errors if any
      if (sponsors.error) throw sponsors.error;
      if (issuers.error) throw issuers.error;
      if (exchanges.error) throw exchanges.error;

      setPendingApprovals({
        sponsors: sponsors.data,
        issuers: issuers.data,
        exchanges: exchanges.data,
      });

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  return (
    <ApprovalContext.Provider value={{
      loading,
      error,
      pendingApprovals,
      updateOrganizationStatus,
      fetchPendingApprovals,
    }}>
      {children}
    </ApprovalContext.Provider>
  );
}

export function useApproval() {
  const context = useContext(ApprovalContext);
  if (context === undefined) {
    throw new Error('useApproval must be used within an ApprovalProvider');
  }
  return context;
} 