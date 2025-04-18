import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// In-memory storage for approval items (resets on server restart)
const approvalItems: any[] = [];

// PUBLIC: Allow n8n to POST approval items without authentication
export async function POST(req: Request) {
  try {
    console.log('Received POST request to /api/approvals');
    const data = await req.json();
    console.log('Received data:', data);
    
    // Store in memory
    approvalItems.push(data);
    console.log('Current approval items:', approvalItems);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/approvals:', error);
    return NextResponse.json({ error: 'Failed to store approval item' }, { status: 400 });
  }
}

// (Optionally protected) GET handler for UI
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    console.log('Received GET request to /api/approvals');
    console.log('Current approval items:', approvalItems);
    
    return NextResponse.json({
      approvalItems: approvalItems || []
    });
  } catch (error) {
    console.error('Error in GET /api/approvals:', error);
    return NextResponse.json({ error: 'Failed to fetch approvals' }, { status: 500 });
  }
} 