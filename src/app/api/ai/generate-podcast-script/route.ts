import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  console.log('Podcast script generation request received');
  try {
    const body = await req.json();
    console.log('Request body:', body);
    
    const {
      url,
      documentName,
      thoughts,
      character_length,
      hostName,
      voiceId,
      orgId,
      podcastTitle,
      tone_of_voice_id,
    } = body;

    if (!thoughts || !character_length) {
      console.error('Missing required fields:', { thoughts: !!thoughts, character_length: !!character_length });
      return NextResponse.json(
        { error: 'Thoughts and character length are required' },
        { status: 400 }
      );
    }

    // Get tone of voice details if ID is provided
    let toneDetails = null;
    if (tone_of_voice_id) {
      const supabase = getSupabaseClient();
      const { data: tone, error } = await supabase
        .from('tone_of_voice')
        .select('name, description')
        .eq('id', tone_of_voice_id)
        .single();
      
      if (!error && tone) {
        toneDetails = tone;
      }
    }

    // Convert character length to approximate word count
    let targetWordCount;
    switch (character_length) {
      case '10 minutes':
        targetWordCount = 1500;
        break;
      case '15 minutes':
        targetWordCount = 2200;
        break;
      case '25 minutes':
        targetWordCount = 3700;
        break;
      default:
        targetWordCount = 1500;
    }

    // Build the prompt
    let prompt = `Write a ${character_length} podcast script (approximately ${targetWordCount} words) for a podcast titled "${podcastTitle}".`;
    
    if (toneDetails) {
      prompt += `\n\nUse this tone of voice: ${toneDetails.name}
Tone description: ${toneDetails.description}`;
    }
    
    if (url) {
      prompt += `\nSource URL: ${url}`;
    }
    
    if (documentName) {
      prompt += `\nSource Document: ${documentName}`;
    }
    
    prompt += `\n\nContent to cover:\n${thoughts}`;
    
    prompt += `\n\nImportant guidelines:
- Write ONLY the raw script text that will be spoken
- NO introductions, NO "welcome to", NO "thanks for listening"
- NO audio cues, sound effects, speaker labels, or formatting
- NO "host:", "guest:", or any other speaker indicators
- Just write the actual content that should be spoken
- Use natural speech patterns and clear transitions between topics`;

    console.log('Sending request to OpenAI with prompt:', prompt);

    // Generate the script using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert podcast script writer. Write ONLY the raw text that will be spoken, with no formatting, speaker labels, or audio cues. The text should flow naturally as if being spoken by a single voice."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: Math.floor(targetWordCount * 1.5),
    });

    console.log('OpenAI response received');

    const script = completion.choices[0]?.message?.content;

    if (!script) {
      console.error('No script content in OpenAI response');
      throw new Error('Failed to generate script - no content received');
    }

    console.log('Script generated successfully');
    return NextResponse.json({ script });
  } catch (error) {
    console.error('Error generating podcast script:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to generate script' },
      { status: 500 }
    );
  }
} 