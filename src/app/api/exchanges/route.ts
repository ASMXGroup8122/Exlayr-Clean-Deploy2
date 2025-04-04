import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

        // Check if user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get user details to check account type
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('account_type')
            .eq('id', session.user.id)
            .single();

        if (userError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized - User not found' },
                { status: 403 }
            );
        }

        // Both admins and sponsors can see all exchanges
        if (user.account_type !== 'admin' && user.account_type !== 'exchange_sponsor') {
            return NextResponse.json(
                { error: 'Unauthorized - Invalid account type' },
                { status: 403 }
            );
        }

        // Get all exchanges for both user types
        const { data: exchanges, error: exchangesError } = await supabase
            .from('exchange')
            .select('*')
            .order('created_at', { ascending: false });

        if (exchangesError) {
            console.error('Error fetching exchanges:', exchangesError);
            return NextResponse.json(
                { error: exchangesError.message },
                { status: 500 }
            );
        }

        return NextResponse.json(exchanges || []);

    } catch (error) {
        console.error('Error in exchanges API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch exchanges' },
            { status: 500 }
        );
    }
} 