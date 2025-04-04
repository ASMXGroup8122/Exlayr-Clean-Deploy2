import { NextRequest, NextResponse } from 'next/server';
import { aiLogger } from '@/lib/ai/logger';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { type, message, data } = body;
    
    if (!type || !message) {
      return NextResponse.json(
        { error: 'Invalid request. Type and message are required.' },
        { status: 400 }
      );
    }
    
    // Log the message using the server-side logger
    aiLogger.logActivity(type, message, data);
    
    // Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in log API:', error);
    return NextResponse.json(
      { error: 'Failed to log message' },
      { status: 500 }
    );
  }
} 