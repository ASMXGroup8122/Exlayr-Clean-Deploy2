'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useApproval } from '@/contexts/ApprovalContext';

export default function AdminApprovalsPage() {
  const supabase = getSupabaseClient();
  const { toast } = useToast();
  const { fetchPendingApprovals } = useApproval();

  const handleApprove = async (id: string, type: string) => {
    try {
      // Call the new RPC function to handle approval
      const { error } = await supabase.rpc('approve_organization', {
        organization_id: id,
        organization_type: type
      });

      if (error) throw error;

      // Refresh the approvals list
      fetchPendingApprovals();
      
      // Show success notification
      toast({
        title: "Organization Approved",
        description: "The organization and its creator have been approved successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error('Failed to approve organization:', error);
      toast({
        title: "Approval Failed",
        description: "There was an error approving the organization. Please try again.",
        variant: "destructive"
      });
    }
  };

  // ... rest of the component code ...
} 