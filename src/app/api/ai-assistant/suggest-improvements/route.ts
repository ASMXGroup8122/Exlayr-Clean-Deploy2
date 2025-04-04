import { NextRequest, NextResponse } from 'next/server';
import { assistantService } from '@/lib/ai/assistantService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sectionId, sectionTitle, sectionContent } = body;
    
    // Validate required fields
    if (!sectionId || !sectionTitle || !sectionContent) {
      return NextResponse.json(
        { error: 'Missing required fields: sectionId, sectionTitle, sectionContent' },
        { status: 400 }
      );
    }
    
    // Get suggestions for the section
    const suggestions = await assistantService.getSuggestions(sectionId, sectionTitle, sectionContent);
    
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error in suggest-improvements API route:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
} 