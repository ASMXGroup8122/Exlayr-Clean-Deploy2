import { NextRequest, NextResponse } from 'next/server';
import { assistantService } from '@/lib/ai/assistantService';
import { AIMessage } from '@/lib/ai/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, conversationHistory = [] } = body;
    
    // Validate required fields
    if (!question) {
      return NextResponse.json(
        { error: 'Missing required field: question' },
        { status: 400 }
      );
    }
    
    // Validate conversation history format if provided
    if (conversationHistory && !Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: 'conversationHistory must be an array' },
        { status: 400 }
      );
    }
    
    // Answer the question
    const answer = await assistantService.answerQuestion(question, conversationHistory as AIMessage[]);
    
    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Error in answer-question API route:', error);
    return NextResponse.json(
      { error: 'Failed to answer question' },
      { status: 500 }
    );
  }
} 