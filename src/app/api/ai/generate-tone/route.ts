import { NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/ai/config';

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create a system prompt that guides the AI to generate a tone description
    const systemPrompt = `You are an expert in creating tone of voice guidelines for social media content. 
    Your task is to craft a detailed tone of voice description that can be used by AI to generate consistent content.`;

    // Create user prompt with the name and optional description
    let userPrompt = `Create a detailed tone of voice description for "${name}" style content.`;
    
    if (description && description.trim()) {
      userPrompt += ` Additional context: "${description}"`;
    }
    
    userPrompt += ` The description should cover: 1) overall feel and personality, 
    2) language style (formal/casual, technical/simple), 
    3) sentence structure and length preferences, 
    4) use of questions or direct address, 
    5) emotional tone (serious, playful, authoritative, etc.).
    
    Return only the description text, without any explanations or sections.`;

    // Get the OpenAI client using lazy initialization
    const openai = getOpenAI();
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    // Extract the generated tone description
    const generatedDescription = completion.choices[0].message.content?.trim();

    return NextResponse.json({ description: generatedDescription });
  } catch (error: any) {
    console.error('Error generating tone description:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate tone description' },
      { status: 500 }
    );
  }
} 