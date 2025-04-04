'use client';

import { useEffect } from 'react';
import { useApproval } from '@/contexts/ApprovalContext';
import { ApprovalList } from '@/components/approvals/ApprovalList';
import RouteGuard from '@/components/guards/RouteGuard';

function ApprovalsPage() {
  const { fetchPendingApprovals, pendingApprovals, updateOrganizationStatus, loading } = useApproval();

  useEffect(() => {
    fetchPendingApprovals();
  }, [fetchPendingApprovals]);

  const handleApprove = async (id: string, type: string) => {
    await updateOrganizationStatus({
      organizationId: id,
      organizationType: type as 'sponsor' | 'issuer' | 'exchange',
      newStatus: 'active'
    });
    fetchPendingApprovals();
  };

  const handleReject = async (id: string, type: string) => {
    await updateOrganizationStatus({
      organizationId: id,
      organizationType: type as 'sponsor' | 'issuer' | 'exchange',
      newStatus: 'suspended',
      reason: 'Rejected by admin'
    });
    fetchPendingApprovals();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pending Approvals</h1>
      
      {/* Sponsors Section */}
      <section>
        <h2 className="text-xl font-medium mb-4">Sponsors</h2>
        <ApprovalList
          approvals={pendingApprovals.sponsors.map(s => ({
            id: s.id,
            type: 'sponsor',
            name: s.sponsor_name,
            status: s.status
          }))}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </section>

      {/* Issuers Section */}
      <section>
        <h2 className="text-xl font-medium mb-4">Issuers</h2>
        <ApprovalList
          approvals={pendingApprovals.issuers.map(i => ({
            id: i.id,
            type: 'issuer',
            name: i.name,
            status: i.status
          }))}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </section>

      {/* Exchanges Section */}
      <section>
        <h2 className="text-xl font-medium mb-4">Exchanges</h2>
        <ApprovalList
          approvals={pendingApprovals.exchanges.map(e => ({
            id: e.id,
            type: 'exchange',
            name: e.name,
            status: e.status
          }))}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </section>
    </div>
  );
}

export default function AdminApprovalsPage() {
  return (
    <RouteGuard allowedTypes={['admin']}>
      <ApprovalsPage />
    </RouteGuard>
  );
} 