import { NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/ai/config';

export async function POST(request: Request) {
  try {
    const { messages, orgId } = await request.json();

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Optional logging for analytics
    console.log(`Processing AI chat request for orgId: ${orgId}`);

    // Get the OpenAI client (lazy initialization)
    const openai = getOpenAI();

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Extract and return the assistant's message
    const aiMessage = response.choices[0]?.message?.content;

    if (!aiMessage) {
      throw new Error('No response generated from OpenAI');
    }

    return NextResponse.json({ message: aiMessage });
  } catch (error: any) {
    console.error('Error in AI chat API:', error);

    // Return appropriate error response
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded' },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'An error occurred with the AI service' },
      { status: 500 }
    );
  }
} 