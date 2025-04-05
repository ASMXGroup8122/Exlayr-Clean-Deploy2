import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const supabase = createRouteHandlerClient<Database>({ 
            cookies: () => cookieStore 
        });

        // Get pending users that are not organization admins
        const { data: requests, error } = await supabase
            .from('users')
            .select('*')
            .eq('status', 'pending')
            .not('is_org_admin', 'eq', true);

        if (error) {
            console.error('Error fetching requests:', error);
            throw error;
        }

        // Format the response
        const formattedRequests = requests.map(user => ({
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            company_name: user.company_name,
            organization_id: user.organization_id,
            user_role: user.user_role,
            status: user.status,
            created_at: user.created_at
        }));

        return NextResponse.json(formattedRequests);

    } catch (error) {
        console.error('Error in pending-requests API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pending requests' },
            { status: 500 }
        );
    }
} 