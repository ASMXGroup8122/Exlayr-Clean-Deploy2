import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// In-memory storage for approval items (resets on server restart)
const approvalItems: any[] = [];

export async function POST(req: Request) {
  try {
    const data = await req.json();
    approvalItems.push(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to store approval item' }, { status: 400 });
  }
}

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
      approvalItems, // Add approval items to the response
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
  }
} 