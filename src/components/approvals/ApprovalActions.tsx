'use client';

import { useApproval } from '@/contexts/ApprovalContext';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { useState } from 'react';

interface ApprovalActionsProps {
  id: string;
  type: 'sponsor' | 'issuer' | 'exchange';
  onComplete?: () => void;
}

export function ApprovalActions({ id, type, onComplete }: ApprovalActionsProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const { updateOrganizationStatus, loading } = useApproval();

  const handleAction = async () => {
    if (!action) return;

    await updateOrganizationStatus({
      organizationId: id,
      organizationType: type,
      newStatus: action === 'approve' ? 'active' : 'suspended',
      reason: action === 'reject' ? 'Rejected by admin' : undefined
    });

    setShowConfirmDialog(false);
    onComplete?.();
  };

  return (
    <>
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          onClick={() => {
            setAction('reject');
            setShowConfirmDialog(true);
          }}
        >
          Reject
        </Button>
        <Button
          onClick={() => {
            setAction('approve');
            setShowConfirmDialog(true);
          }}
        >
          Approve
        </Button>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === 'approve' ? 'Approve Organization' : 'Reject Organization'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {action} this {type}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleAction} disabled={loading}>
              Confirm {action}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 