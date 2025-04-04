'use client';

import { ApprovalCard } from './ApprovalCard';

interface ApprovalListProps {
  approvals: Array<{
    id: string;
    type: 'sponsor' | 'issuer' | 'exchange';
    name: string;
    status: string;
  }>;
  onApprove: (id: string, type: string) => void;
  onReject: (id: string, type: string) => void;
}

export function ApprovalList({ approvals, onApprove, onReject }: ApprovalListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {approvals.map((approval) => (
        <ApprovalCard
          key={approval.id}
          {...approval}
          onApprove={() => onApprove(approval.id, approval.type)}
          onReject={() => onReject(approval.id, approval.type)}
        />
      ))}
    </div>
  );
} 