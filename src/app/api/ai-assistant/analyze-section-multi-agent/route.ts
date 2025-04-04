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
    
    // Analyze the section using the multi-agent architecture
    const analysis = await assistantService.analyzeSectionWithMultiAgent(sectionId, sectionTitle, sectionContent);
    
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error in analyze-section-multi-agent API route:', error);
    return NextResponse.json(
      { error: 'Failed to analyze section with multi-agent architecture' },
      { status: 500 }
    );
  }
} 