import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify knowledge base selection
 * This endpoint simply returns the selected knowledge base for testing purposes
 */
export async function POST(request: Request) {
  try {
    const { knowledgeBase } = await request.json();
    
    return NextResponse.json({
      success: true,
      message: `Selected knowledge base: ${knowledgeBase || 'None specified'}`,
      knowledgeBase: knowledgeBase || 'None specified',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test-knowledge-base endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process request',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 