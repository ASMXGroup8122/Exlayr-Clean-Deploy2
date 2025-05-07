import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient();
        
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get issuers with all fields
        const { data: issuers, error: issuersError } = await supabase
            .from('issuers')
            .select('*')
            .order('created_at', { ascending: false });

        if (issuersError) {
            console.error('Error fetching issuers:', issuersError);
            return NextResponse.json(
                { error: issuersError.message },
                { status: 500 }
            );
        }

        return NextResponse.json(issuers || []);

    } catch (error) {
        console.error('Error in issuers API:', error);
        return NextResponse.json(
            { error: 'Failed to fetch issuers' },
            { status: 500 }
        );
    }
} 