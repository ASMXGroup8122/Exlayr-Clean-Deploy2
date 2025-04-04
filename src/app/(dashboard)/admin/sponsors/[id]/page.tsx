'use client';

import { useState, useEffect } from 'react';
import { useApproval } from '@/contexts/ApprovalContext';
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

// ... existing imports and type definitions

interface SponsorDetailsProps {
  params: {
    id: string;
  };
}

export default function SponsorDetailsPage({ params: { id } }: SponsorDetailsProps) {
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { updateOrganizationStatus, loading } = useApproval();
  
  // ... existing sponsor fetching logic

  const handleStatusChange = async (approved: boolean) => {
    if (!sponsor) return;
    
    try {
      await updateOrganizationStatus({
        organizationId: id,
        organizationType: 'sponsor',
        newStatus: approved ? 'active' : 'suspended',
        reason: approved ? 'Approved by admin' : 'Suspended by admin'
      });
      
      // Refresh sponsor data after status change
      const { data } = await supabase
        .from('exchange_sponsor')
        .select('*')
        .eq('id', id)
        .single();
        
      if (data) setSponsor(data);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <div>
      {/* Add the approval section right after the header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{sponsor?.sponsor_name}</h1>
            <p className="text-sm text-gray-500">Regulated by {sponsor?.regulator}</p>
          </div>
        </div>
        
        {/* Add approval toggle */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium">Status: </h2>
              <span className={`px-2 py-1 text-sm rounded-full ${
                sponsor?.status === 'active' ? 'bg-green-100 text-green-800' :
                sponsor?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {sponsor?.status}
              </span>
            </div>
            {sponsor?.status === 'pending' && (
              <p className="text-sm text-gray-600 mt-1">
                Future Admin: {sponsor.contact_name}
              </p>
            )}
          </div>
          <Switch
            checked={sponsor?.status === 'active'}
            onCheckedChange={() => setShowConfirmDialog(true)}
            disabled={loading}
          />
        </div>

        {/* Rest of your existing UI */}
        
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {sponsor?.status === 'active' ? 'Suspend Sponsor' : 'Approve Sponsor'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {sponsor?.status === 'active' ? 'suspend' : 'approve'} this sponsor?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button 
                onClick={() => {
                  handleStatusChange(sponsor?.status !== 'active');
                  setShowConfirmDialog(false);
                }}
                disabled={loading}
              >
                Confirm
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
} 