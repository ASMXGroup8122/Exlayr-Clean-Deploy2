import { NextRequest, NextResponse } from 'next/server';
import { assistantService } from '@/lib/ai/assistantService';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.sectionId || !body.sectionTitle || !body.sectionContent) {
      return NextResponse.json(
        { error: 'Missing required fields: sectionId, sectionTitle, and sectionContent' },
        { status: 400 }
      );
    }
    
    // Analyze the section
    const result = await assistantService.analyzeSectionWithMultiAgent(
      body.sectionId,
      body.sectionTitle,
      body.sectionContent
    );
    
    // Return the result
    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error analyzing section:', error);
    return NextResponse.json(
      { error: 'An error occurred while analyzing the section' },
      { status: 500 }
    );
  }
} 