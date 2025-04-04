import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const [sponsors, issuers, exchanges] = await Promise.all([
      supabase.from('sponsors').select('*').eq('status', 'pending'),
      supabase.from('issuers').select('*').eq('status', 'pending'),
      supabase.from('exchanges').select('*').eq('status', 'pending'),
    ]);

    return NextResponse.json({
      sponsors: sponsors.data || [],
      issuers: issuers.data || [],
      exchanges: exchanges.data || [],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
  }
} 