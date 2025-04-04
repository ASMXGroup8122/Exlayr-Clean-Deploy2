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
    
    // Analyze the section
    const analysis = await assistantService.analyzeSection(sectionId, sectionTitle, sectionContent);
    
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error in analyze-section API route:', error);
    return NextResponse.json(
      { error: 'Failed to analyze section' },
      { status: 500 }
    );
  }
} 