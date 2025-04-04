import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: { organizationType: string; id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    const { newStatus, reason } = await request.json();
    const tableName = `${params.organizationType}s`;

    // Start a transaction
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update organization status
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ status: newStatus })
      .eq('id', params.id);

    if (updateError) throw updateError;

    // Record in approval history
    const { error: historyError } = await supabase
      .from('approval_history')
      .insert({
        organization_id: params.id,
        organization_type: params.organizationType,
        new_status: newStatus,
        changed_by: user.id,
        reason,
      });

    if (historyError) throw historyError;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update approval status' },
      { status: 500 }
    );
  }
} 