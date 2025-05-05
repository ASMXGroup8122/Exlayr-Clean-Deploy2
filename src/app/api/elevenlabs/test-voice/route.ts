import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { apiKey, voiceId, text, settings } = await request.json();
    
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API key is required and must be a string' },
        { status: 400 }
      );
    }

    if (!voiceId || typeof voiceId !== 'string') {
      return NextResponse.json(
        { error: 'Voice ID is required and must be a string' },
        { status: 400 }
      );
    }

    // Default text if none provided
    const sampleText = text || "This is a sample of how this voice sounds.";

    // Prepare voice settings
    const voiceSettings = {
      stability: settings?.stability ?? 0.30,
      similarity_boost: settings?.clarity ?? 0.75,
    };

    // Make a request to ElevenLabs API to generate speech
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: sampleText,
        model_id: "eleven_monolingual_v1",
        voice_settings: voiceSettings
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return NextResponse.json(
        { error: `Failed to generate speech: ${errorData}` },
        { status: response.status }
      );
    }

    // Get audio data as blob
    const audioData = await response.arrayBuffer();
    
    // Return the audio data
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: any) {
    console.error('Error testing ElevenLabs voice:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to test voice' },
      { status: 500 }
    );
  }
} 