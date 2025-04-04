import { NextRequest, NextResponse } from 'next/server';
import { assistantService } from '@/lib/ai/assistantService';

export async function POST(request: NextRequest) {
  console.log('Received request to /api/ai-assistant/relevant-rules');
  
  try {
    const { content, knowledgeBase, isTrainingMode } = await request.json();
    
    if (!content) {
      return NextResponse.json({ 
        success: false, 
        error: 'Content is required' 
      }, { status: 400 });
    }
    
    console.log(`Finding relevant rules for content with knowledge base: ${knowledgeBase || 'default'}`);
    console.log(`Training mode: ${isTrainingMode ? 'enabled' : 'disabled'}`);
    
    // Get relevant rules from the assistant service
    const rules = await assistantService.getRelevantRules(content, knowledgeBase, isTrainingMode);
    
    return NextResponse.json({ 
      success: true, 
      rules,
      knowledgeBase,
      isTrainingMode
    });
    
  } catch (error) {
    console.error('Error in relevant-rules API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }, { status: 500 });
  }
} 