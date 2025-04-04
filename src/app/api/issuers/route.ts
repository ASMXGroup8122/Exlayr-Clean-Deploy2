import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const cookieStore = cookies(); // Keep this as is
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore }); // This line is correct

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