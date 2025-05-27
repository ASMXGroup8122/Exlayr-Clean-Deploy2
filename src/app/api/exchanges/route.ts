import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Get the user profile using the improved helper
        const profile = await getServerUserProfile();
        if (!profile) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check account type permissions
        if (profile.account_type !== 'admin' && profile.account_type !== 'exchange_sponsor') {
            return NextResponse.json(
                { error: 'Unauthorized - Invalid account type' },
                { status: 403 }
            );
        }

        // Get all exchanges using a single client instance
        const supabase = await createServerSupabaseClient();
        const { data: exchanges, error: exchangesError } = await supabase
            .from('exchange')
            .select('*, exchange_member_roles(*)')
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