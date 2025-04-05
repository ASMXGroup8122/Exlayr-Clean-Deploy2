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

        // Get issuers with all fields
        const { data: issuers, error: issuersError } = await supabase
            .from('issuers')
            .select('*')
            .order('created_at', { ascending: false });

        if (issuersError) {
            console.error('Error fetching issuers:', issuersError);
            return new NextResponse(
                JSON.stringify({ error: issuersError.message }),
                { 
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        return new NextResponse(
            JSON.stringify(issuers || []),
            { 
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Error in issuers API:', error);
        return new NextResponse(
            JSON.stringify({ error: 'Failed to fetch issuers' }),
            { 
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
} 