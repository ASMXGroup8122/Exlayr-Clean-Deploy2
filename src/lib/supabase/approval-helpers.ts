import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export async function fetchPendingApprovals() {
  const supabase = createClientComponentClient<Database>();

  const [sponsors, issuers, exchanges] = await Promise.all([
    supabase
      .from('sponsors')
      .select('id, sponsor_name, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('issuers')
      .select('id, name, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('exchanges')
      .select('id, name, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ]);

  return {
    sponsors: sponsors.data || [],
    issuers: issuers.data || [],
    exchanges: exchanges.data || [],
  };
}

export async function updateApprovalStatus({
  id,
  type,
  status,
  reason,
  userId,
}: {
  id: string;
  type: 'sponsor' | 'issuer' | 'exchange';
  status: 'active' | 'suspended';
  reason?: string;
  userId: string;
}) {
  const supabase = createClientComponentClient<Database>();
  const tableName = `${type}s`;

  // Start transaction
  const { error: updateError } = await supabase
    .from(tableName)
    .update({ status })
    .eq('id', id);

  if (updateError) throw updateError;

  // Record history
  const { error: historyError } = await supabase
    .from('approval_history')
    .insert({
      organization_id: id,
      organization_type: type,
      new_status: status,
      changed_by: userId,
      reason,
    });

  if (historyError) throw historyError;
} 