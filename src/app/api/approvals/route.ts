import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// In-memory storage for approval items (resets on server restart)
const approvalItems: any[] = [];

// PUBLIC: Allow n8n to POST approval items without authentication
export async function POST(req: Request) {
  try {
    console.log('Received POST request to /api/approvals');
    const data = await req.json();
    console.log('Received data:', data);
    
    // Modify resumeUrl
    const targetBaseUrl = "https://app.exlayr.ai"; // Hardcoded base URL
    if (data.resumeUrl && typeof data.resumeUrl === 'string') {
      try {
        const originalUrl = new URL(data.resumeUrl);
        // Construct new URL using the target base and original path/query
        const newUrl = new URL(originalUrl.pathname + originalUrl.search, targetBaseUrl);
        data.resumeUrl = newUrl.toString();
        console.log(`Modified resumeUrl to: ${data.resumeUrl}`);
      } catch (urlError) {
        console.error('Error modifying resumeUrl:', urlError);
        // Decide if you want to proceed with the original URL or throw an error
      }
    }
    
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
  const supabase = await createClient();

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