import { NextRequest, NextResponse } from 'next/server';

// Store the API key in memory (this will be lost on server restart)
let openaiApiKey: string | null = null;

/**
 * Get the OpenAI API key
 * @returns The OpenAI API key or null if not set
 */
export function getOpenAIApiKey(): string | null {
  return openaiApiKey || process.env.OPENAI_API_KEY || null;
}

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'API key is required' 
      }, { status: 400 });
    }
    
    // Store the API key
    openaiApiKey = apiKey;
    
    // Set the API key in the environment
    process.env.OPENAI_API_KEY = apiKey;
    
    return NextResponse.json({ 
      success: true, 
      message: 'API key set successfully' 
    });
  } catch (error) {
    console.error('Failed to set OpenAI API key:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to set API key' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    hasApiKey: !!getOpenAIApiKey()
  });
} 