import { NextRequest, NextResponse } from 'next/server';
import { initializePineconeWithRules } from '@/lib/ai/vectorSearch';

export async function POST(request: NextRequest) {
  try {
    // Initialize Pinecone with listing rules
    await initializePineconeWithRules();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Pinecone initialized successfully with listing rules' 
    });
  } catch (error) {
    console.error('Error initializing Pinecone:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to initialize Pinecone' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to initialize Pinecone with listing rules' 
  });
} 