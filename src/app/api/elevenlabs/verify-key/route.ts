import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();
    
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API key is required and must be a string' },
        { status: 400 }
      );
    }

    // Make a request to ElevenLabs API to verify the key is valid
    try {
      console.log("Making request to ElevenLabs API...");
      const response = await fetch('https://api.elevenlabs.io/v1/user', {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.log("ElevenLabs API returned error:", response.status);
        return NextResponse.json(
          { error: 'Invalid API key or ElevenLabs API not accessible', status: response.status },
          { status: 401 }
        );
      }

      // Successfully got a response from ElevenLabs
      const userData = await response.json();
      console.log("ElevenLabs API verification successful");
      
      return NextResponse.json({
        verified: true,
        subscription: userData.subscription || {},
      });
    } catch (fetchError: any) {
      console.error("Fetch error during ElevenLabs verification:", fetchError);
      return NextResponse.json(
        { error: `Error connecting to ElevenLabs: ${fetchError.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error verifying ElevenLabs API key:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to verify API key' },
      { status: 500 }
    );
  }
} 