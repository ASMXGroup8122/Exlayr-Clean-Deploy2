import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIApiKey } from '../set-api-key/route';

export async function POST(request: NextRequest) {
  try {
    // Get the API key
    const apiKey = getOpenAIApiKey();
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not set' },
        { status: 400 }
      );
    }

    // Get the request body
    const body = await request.json();

    // Forward the request to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    // Get the response data
    const data = await response.json();

    // Return the response
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in OpenAI proxy:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to OpenAI' },
      { status: 500 }
    );
  }
} 