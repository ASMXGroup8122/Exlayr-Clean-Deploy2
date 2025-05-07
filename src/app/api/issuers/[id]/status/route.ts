import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const body = await request.json();
        const { status, rejection_reason } = body;
        
        if (!status) {
            return NextResponse.json(
                { error: 'Status is required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No user found');

        // First, check if the issuer has an admin and who created it
        const { data: issuerData, error: issuerError } = await supabase
            .from('issuers')
            .select('admin_user_id, created_by')
            .eq('id', params.id)
            .single();

        if (issuerError) throw issuerError;

        // If no admin is set and status is being changed to 'approved', set current user as admin
        // If created_by is not set, also set it to the current user
        const updateData = {
            status,
            ...(status === 'rejected' ? { 
                rejection_reason,
                rejected_at: new Date().toISOString(),
                rejected_by: user.id
            } : {}),
            ...(status === 'approved' ? {
                approved_at: new Date().toISOString(),
                approved_by: user.id
            } : {}),
            ...(status === 'approved' && !issuerData?.admin_user_id ? { admin_user_id: user.id } : {}),
            ...(issuerData?.created_by === null ? { created_by: user.id } : {})
        };

        const { error: updateError } = await supabase
            .from('issuers')
            .update(updateData)
            .eq('id', params.id);

        if (updateError) throw updateError;

        // If we just set an admin, create a user_issuers record
        if (status === 'approved' && !issuerData?.admin_user_id) {
            const { error: linkError } = await supabase
                .from('user_issuers')
                .insert({
                    user_id: user.id,
                    issuer_id: params.id,
                    role: 'admin'
                });

            if (linkError) throw linkError;
        }

        return NextResponse.json({ 
            success: true,
            isNewAdmin: status === 'approved' && !issuerData?.admin_user_id
        });

    } catch (error) {
        console.error('Error updating issuer status:', error);
        return NextResponse.json(
            { error: 'Failed to update issuer status' },
            { status: 500 }
        );
    }
} 