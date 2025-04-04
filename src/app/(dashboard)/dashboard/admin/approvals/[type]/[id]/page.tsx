'use client';

import { useEffect, useState } from 'react';
import { useApproval } from '@/contexts/ApprovalContext';
import { ApprovalActions } from '@/components/approvals/ApprovalActions';
import { useRouter } from 'next/navigation';
import RouteGuard from '@/components/guards/RouteGuard';

interface OrganizationDetailsProps {
  params: {
    type: 'sponsor' | 'issuer' | 'exchange';
    id: string;
  };
}

function OrganizationDetailsPage({ params: { type, id } }: OrganizationDetailsProps) {
  const router = useRouter();
  const { pendingApprovals, loading } = useApproval();
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    // Find the organization details from pendingApprovals
    const org = pendingApprovals[`${type}s`].find(o => o.id === id);
    setDetails(org);
  }, [type, id, pendingApprovals]);

  if (loading || !details) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {type === 'sponsor' ? details.sponsor_name : details.name}
      </h1>

      <div className="bg-white shadow rounded-lg p-6">
        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Organization Type</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">{type}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900">{details.status}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <ApprovalActions
            id={id}
            type={type}
            onComplete={() => router.push('/dashboard/admin/approvals')}
          />
        </div>
      </div>
    </div>
  );
}

export default function WrappedOrganizationDetailsPage(props: OrganizationDetailsProps) {
  return (
    <RouteGuard allowedTypes={['admin']}>
      <OrganizationDetailsPage {...props} />
    </RouteGuard>
  );
} 